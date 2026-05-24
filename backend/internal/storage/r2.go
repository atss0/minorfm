package storage

import (
	"bytes"
	"context"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/disintegration/imaging"
	"github.com/google/uuid"
)

type R2Store struct {
	client    *s3.Client
	bucket    string
	publicURL string
}

// UploadResult holds URLs for the original and optional thumbnail.
type UploadResult struct {
	URL          string `json:"url"`
	ThumbnailURL string `json:"thumbnail_url,omitempty"`
}

func NewR2Store(accountID, accessKeyID, secretAccessKey, bucket, publicURL string) *R2Store {
	endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)

	client := s3.New(s3.Options{
		BaseEndpoint: aws.String(endpoint),
		Region:       "auto",
		Credentials:  credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, ""),
	})

	return &R2Store{
		client:    client,
		bucket:    bucket,
		publicURL: strings.TrimRight(publicURL, "/"),
	}
}

// Upload stores the file and returns its public URL.
func (r *R2Store) Upload(ctx context.Context, file multipart.File, header *multipart.FileHeader, folder string) (string, error) {
	ext := strings.ToLower(filepath.Ext(header.Filename))
	key := fmt.Sprintf("%s/%s%s", folder, uuid.New().String(), ext)

	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	_, err := r.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(r.bucket),
		Key:         aws.String(key),
		Body:        file,
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", fmt.Errorf("r2 upload: %w", err)
	}

	return fmt.Sprintf("%s/%s", r.publicURL, key), nil
}

// UploadWithThumbnail uploads the original image and a resized thumbnail.
// Thumbnail is a JPEG capped at maxW×maxH pixels, maintaining aspect ratio.
func (r *R2Store) UploadWithThumbnail(ctx context.Context, file multipart.File, header *multipart.FileHeader, folder string, maxW, maxH int) (UploadResult, error) {
	// Read full body so we can upload original + decode for thumbnail
	data, err := io.ReadAll(file)
	if err != nil {
		return UploadResult{}, err
	}

	ext := strings.ToLower(filepath.Ext(header.Filename))
	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "image/jpeg"
	}

	id := uuid.New().String()
	origKey := fmt.Sprintf("%s/%s%s", folder, id, ext)
	thumbKey := fmt.Sprintf("%s/%s_thumb.jpg", folder, id)

	// Upload original
	if _, err := r.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(r.bucket),
		Key:         aws.String(origKey),
		Body:        bytes.NewReader(data),
		ContentType: aws.String(contentType),
	}); err != nil {
		return UploadResult{}, fmt.Errorf("r2 upload original: %w", err)
	}

	// Generate and upload thumbnail
	var thumbURL string
	if img, _, err := image.Decode(bytes.NewReader(data)); err == nil {
		thumb := imaging.Fit(img, maxW, maxH, imaging.Lanczos)
		var thumbBuf bytes.Buffer
		if err := imaging.Encode(&thumbBuf, thumb, imaging.JPEG, imaging.JPEGQuality(80)); err == nil {
			if _, err := r.client.PutObject(ctx, &s3.PutObjectInput{
				Bucket:      aws.String(r.bucket),
				Key:         aws.String(thumbKey),
				Body:        bytes.NewReader(thumbBuf.Bytes()),
				ContentType: aws.String("image/jpeg"),
			}); err == nil {
				thumbURL = fmt.Sprintf("%s/%s", r.publicURL, thumbKey)
			}
		}
	}

	return UploadResult{
		URL:          fmt.Sprintf("%s/%s", r.publicURL, origKey),
		ThumbnailURL: thumbURL,
	}, nil
}

// UploadAudio stores an audio file and returns its public URL.
func (r *R2Store) UploadAudio(ctx context.Context, file multipart.File, header *multipart.FileHeader, folder string) (string, error) {
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" {
		ext = ".m4a"
	}
	key := fmt.Sprintf("%s/%s%s", folder, uuid.New().String(), ext)

	contentType := header.Header.Get("Content-Type")
	switch {
	case contentType != "" && contentType != "application/octet-stream":
		// use as-is
	case ext == ".mp3":
		contentType = "audio/mpeg"
	case ext == ".ogg":
		contentType = "audio/ogg"
	case ext == ".wav":
		contentType = "audio/wav"
	default:
		contentType = "audio/mp4"
	}

	_, err := r.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(r.bucket),
		Key:         aws.String(key),
		Body:        file,
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", fmt.Errorf("r2 upload audio: %w", err)
	}

	return fmt.Sprintf("%s/%s", r.publicURL, key), nil
}

// Delete removes an object by its public URL (extracts the key).
func (r *R2Store) Delete(ctx context.Context, publicURL string) error {
	key := strings.TrimPrefix(publicURL, r.publicURL+"/")
	if key == publicURL {
		return nil
	}
	_, err := r.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(r.bucket),
		Key:    aws.String(key),
	})
	return err
}

// ValidateImage checks size (<= maxBytes) and MIME type (sniffed from file content).
func ValidateImage(header *multipart.FileHeader, file io.ReadSeeker, maxBytes int64) error {
	if header.Size > maxBytes {
		return fmt.Errorf("file too large: max %d bytes", maxBytes)
	}

	buf := make([]byte, 512)
	if _, err := file.Read(buf); err != nil {
		return err
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return err
	}

	// Detect from actual bytes rather than trusting the browser-supplied header
	ct := http.DetectContentType(buf)
	// Strip parameters (e.g. "image/jpeg; charset=...")
	if idx := strings.Index(ct, ";"); idx != -1 {
		ct = strings.TrimSpace(ct[:idx])
	}
	allowed := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
		"image/webp": true,
		"image/gif":  true,
	}
	if !allowed[ct] {
		return fmt.Errorf("unsupported image type: %s", ct)
	}
	return nil
}
