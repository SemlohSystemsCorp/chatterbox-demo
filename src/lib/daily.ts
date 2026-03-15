const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_URL = "https://api.daily.co/v1";

interface CreateRoomOptions {
  name?: string;
  privacy?: "public" | "private";
  expiresInMinutes?: number;
}

export async function createDailyRoom(options: CreateRoomOptions = {}) {
  const response = await fetch(`${DAILY_API_URL}/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      name: options.name,
      privacy: options.privacy || "private",
      properties: {
        exp:
          Math.floor(Date.now() / 1000) +
          (options.expiresInMinutes || 60) * 60,
        enable_chat: true,
        enable_screenshare: true,
        enable_recording: false,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create Daily room: ${response.statusText}`);
  }

  return response.json();
}

export async function createMeetingToken(roomName: string, userId: string) {
  const response = await fetch(`${DAILY_API_URL}/meeting-tokens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_id: userId,
        is_owner: false,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create meeting token: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteDailyRoom(roomName: string) {
  const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete Daily room: ${response.statusText}`);
  }

  return response.json();
}
