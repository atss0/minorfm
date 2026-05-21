package mailer

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
)

const resendEndpoint = "https://api.resend.com/emails"

type Mailer struct {
	apiKey string
	from   string
}

func New(apiKey, from string) *Mailer {
	return &Mailer{apiKey: apiKey, from: from}
}

type sendRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
}

type sendResponse struct {
	ID string `json:"id"`
}

type errorResponse struct {
	Message string `json:"message"`
}

func (m *Mailer) Send(to, subject, html string) error {
	if m.apiKey == "" {
		log.Println("mailer: RESEND_API_KEY not set, skipping email")
		return nil
	}

	payload := sendRequest{
		From:    m.from,
		To:      []string{to},
		Subject: subject,
		HTML:    html,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("mailer: marshal error: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, resendEndpoint, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("mailer: request error: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+m.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("mailer: send error: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode >= 400 {
		var errResp errorResponse
		json.Unmarshal(respBody, &errResp)
		return fmt.Errorf("mailer: resend API error (%d): %s", resp.StatusCode, errResp.Message)
	}

	var result sendResponse
	json.Unmarshal(respBody, &result)
	log.Printf("mailer: email sent to %s (id: %s)", to, result.ID)

	return nil
}

func (m *Mailer) SendPasswordReset(to, resetURL string) error {
	subject := "MINOR.fm — Şifre Sıfırlama"
	html := fmt.Sprintf(`
<html><body style="font-family:sans-serif;background:#0b1114;color:#e0e0e0;padding:40px">
  <h2 style="color:#bc002d">Şifre Sıfırlama</h2>
  <p>Hesabınız için bir şifre sıfırlama talebinde bulunuldu.</p>
  <p>
    <a href="%s" style="display:inline-block;padding:12px 24px;background:#bc002d;color:#fff;text-decoration:none;border-radius:6px">
      Şifremi Sıfırla
    </a>
  </p>
  <p style="color:#666;font-size:12px">Bu bağlantı 1 saat geçerlidir. Talebi siz yapmadıysanız bu e-postayı görmezden gelin.</p>
</body></html>`, resetURL)
	return m.Send(to, subject, html)
}
