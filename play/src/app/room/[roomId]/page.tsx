import { RoomView } from "@/app/_components/rooms/room-view";

export default function RoomPage({ params }: { params: { roomId: string } }) {
  return <RoomView roomId={params.roomId} />;
}
