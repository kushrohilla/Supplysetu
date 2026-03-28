import { OrderDetailScreen } from "@/modules/orders/OrderDetailScreen";

export default function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <OrderDetailScreen orderId={params.id} />;
}
