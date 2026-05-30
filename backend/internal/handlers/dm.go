package handlers

import (
	"github.com/atss0/minorfm/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// CreateDMRoom finds or creates a 1-on-1 DM room between the caller and a target user.
func (h *Handler) CreateDMRoom(c *fiber.Ctx) error {
	callerID := c.Locals("userID").(string)

	var body struct {
		MemberIDs []string `json:"member_ids"`
	}
	if err := c.BodyParser(&body); err != nil || len(body.MemberIDs) != 1 {
		return fiber.NewError(fiber.StatusBadRequest, "member_ids must contain exactly one user id")
	}
	targetID := body.MemberIDs[0]
	if targetID == callerID {
		return fiber.NewError(fiber.StatusBadRequest, "cannot create DM with yourself")
	}

	// Check target user exists
	var targetUser models.User
	if err := h.DB.Select("id, username, avatar_url").First(&targetUser, "id = ?", targetID).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "user not found")
	}

	// Find existing DM room shared by both users
	var existingIDs []string
	h.DB.Raw(`
		SELECT m1.room_id::text
		FROM chat_room_members m1
		JOIN chat_room_members m2 ON m1.room_id = m2.room_id
		JOIN chat_rooms r ON r.id = m1.room_id
		WHERE m1.user_id = ? AND m2.user_id = ? AND r.type = 'dm'
		LIMIT 1
	`, callerID, targetID).Scan(&existingIDs)

	if len(existingIDs) > 0 {
		var room models.ChatRoom
		h.DB.First(&room, "id = ?", existingIDs[0])
		return c.JSON(fiber.Map{"room": room})
	}

	// Create new DM room
	room := models.ChatRoom{
		ID:   uuid.New(),
		Name: targetUser.Username,
		Slug: uuid.New().String(),
		Type: "dm",
	}
	if err := h.DB.Create(&room).Error; err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "could not create room")
	}

	callerUUID, _ := uuid.Parse(callerID)
	members := []models.ChatRoomMember{
		{ID: uuid.New(), RoomID: room.ID, UserID: callerUUID},
		{ID: uuid.New(), RoomID: room.ID, UserID: targetUser.ID},
	}
	h.DB.Create(&members)

	return c.JSON(fiber.Map{"room": room})
}

// GetDMRooms returns all DM rooms for the authenticated user, with the other
// participant's name/avatar and the last message preview.
func (h *Handler) GetDMRooms(c *fiber.Ctx) error {
	callerID := c.Locals("userID").(string)

	// Fetch room IDs where caller is a member
	var memberRows []models.ChatRoomMember
	h.DB.Where("user_id = ?", callerID).Find(&memberRows)

	if len(memberRows) == 0 {
		return c.JSON(fiber.Map{"rooms": []interface{}{}})
	}

	roomIDs := make([]uuid.UUID, 0, len(memberRows))
	for _, m := range memberRows {
		roomIDs = append(roomIDs, m.RoomID)
	}

	var rooms []models.ChatRoom
	h.DB.Where("id IN ? AND type = 'dm'", roomIDs).Find(&rooms)

	type RoomDTO struct {
		ID            string  `json:"id"`
		Name          string  `json:"name"`
		Type          string  `json:"type"`
		AvatarURL     string  `json:"avatar_url"`
		LastMessage   *string `json:"last_message"`
		LastMessageAt *string `json:"last_message_at"`
		UnreadCount   int     `json:"unread_count"`
	}

	result := make([]RoomDTO, 0, len(rooms))
	for _, room := range rooms {
		// Find the other participant
		var otherMember models.ChatRoomMember
		h.DB.Where("room_id = ? AND user_id != ?", room.ID, callerID).First(&otherMember)

		var otherUser models.User
		h.DB.Select("username, avatar_url").First(&otherUser, "id = ?", otherMember.UserID)

		dto := RoomDTO{
			ID:        room.ID.String(),
			Name:      otherUser.Username,
			Type:      room.Type,
			AvatarURL: otherUser.AvatarURL,
		}

		// Last message preview
		var lastMsg models.ChatMessage
		if err := h.DB.Where("room_id = ?", room.ID.String()).
			Order("created_at DESC").First(&lastMsg).Error; err == nil {
			body := lastMsg.Body
			ts := lastMsg.CreatedAt.Format("2006-01-02T15:04:05Z07:00")
			dto.LastMessage = &body
			dto.LastMessageAt = &ts
		}

		result = append(result, dto)
	}

	return c.JSON(fiber.Map{"rooms": result})
}
