export const ORDER_CREATED_QUERY_VALUE = "1";

export const getOrderCreatedSuccessMessage = (createdValue: string | null) =>
  createdValue === ORDER_CREATED_QUERY_VALUE ? "Order placed successfully." : null;
