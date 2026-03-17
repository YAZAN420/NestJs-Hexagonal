export interface ChatPayload {
  room?: string;
  receiverId?: string;
  isGroup?: boolean;
  message?: string;
}
