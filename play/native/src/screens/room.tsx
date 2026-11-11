import { useParams } from "react-router-dom";

import { RoomView } from "@/app/_components/rooms/room-view";

export function RoomRoute() {
  const { roomId } = useParams();
  if (!roomId) return null;
  return <RoomView roomId={roomId} />;
}
