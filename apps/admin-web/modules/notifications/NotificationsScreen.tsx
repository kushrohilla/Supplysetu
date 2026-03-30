"use client";

import { startTransition, useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { notificationService } from "@/services/notification.service";
import { ApiError } from "@/services/api.service";
import { clearAuthSession, getApiErrorMessage } from "@/services/auth.service";
import type { NotificationChannel, NotificationEventType, NotificationLogListResponse, NotificationStatus } from "@/types/notification";

const PAGE_SIZE = 20;

const defaultResponse: NotificationLogListResponse = {
  items: [],
  pagination: {
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    total_pages: 0,
  },
};

const eventTypeOptions: Array<{ label: string; value: "" | NotificationEventType }> = [
  { label: "All events", value: "" },
  { label: "Order Confirmed", value: "order_confirmed" },
  { label: "Order Dispatched", value: "order_dispatched" },
  { label: "Order Delivered", value: "order_delivered" },
  { label: "Payment Recorded", value: "payment_recorded" },
  { label: "Inactivity Reminder", value: "inactivity_reminder" },
];

const channelOptions: Array<{ label: string; value: "" | NotificationChannel }> = [
  { label: "All channels", value: "" },
  { label: "In-app", value: "in_app" },
  { label: "SMS", value: "sms" },
  { label: "WhatsApp", value: "whatsapp" },
];

const statusOptions: Array<{ label: string; value: "" | NotificationStatus }> = [
  { label: "All statuses", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Sent", value: "sent" },
  { label: "Failed", value: "failed" },
  { label: "Skipped", value: "skipped" },
];

export function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationLogListResponse>(defaultResponse);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventType, setEventType] = useState<"" | NotificationEventType>("");
  const [channel, setChannel] = useState<"" | NotificationChannel>("");
  const [status, setStatus] = useState<"" | NotificationStatus>("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const loadNotifications = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await notificationService.fetchNotificationLog({
          eventType: eventType || undefined,
          channel: channel || undefined,
          status: status || undefined,
          page,
          limit: PAGE_SIZE,
        });
        setNotifications(response);
      } catch (loadError) {
        if (loadError instanceof ApiError && loadError.status === 401) {
          clearAuthSession();
          router.push("/login");
          return;
        }

        setError(getApiErrorMessage(loadError, "Unable to load notification log."));
      } finally {
        setLoading(false);
      }
    };

    void loadNotifications();
  }, [channel, eventType, page, router, status]);

  const onFilterChange = <T extends string>(
    setter: (value: T) => void,
    nextValue: T,
  ) => {
    startTransition(() => {
      setter(nextValue);
      setPage(1);
    });
  };

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
            <p className="text-sm text-slate-600">
              Track tenant-scoped in-app, SMS, and WhatsApp notification attempts with delivery status and payload audit details.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-medium">Event</span>
              <select
                value={eventType}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  onFilterChange(setEventType, event.target.value as "" | NotificationEventType)}
                className="min-w-[180px] rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 outline-none transition focus:border-slate-400 focus:bg-white"
              >
                {eventTypeOptions.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-medium">Channel</span>
              <select
                value={channel}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  onFilterChange(setChannel, event.target.value as "" | NotificationChannel)}
                className="min-w-[160px] rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 outline-none transition focus:border-slate-400 focus:bg-white"
              >
                {channelOptions.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-medium">Status</span>
              <select
                value={status}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  onFilterChange(setStatus, event.target.value as "" | NotificationStatus)}
                className="min-w-[160px] rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 outline-none transition focus:border-slate-400 focus:bg-white"
              >
                {statusOptions.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Delivery log</h2>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading notifications...</div>
        ) : notifications.items.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center p-6">
            <EmptyState
              icon="N"
              title="No notification attempts yet"
              helper="New order, dispatch, payment, and inactivity reminder activity will appear here."
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="border-b border-slate-200 px-4 py-3 font-medium">Event</th>
                    <th className="border-b border-slate-200 px-4 py-3 font-medium">Recipient</th>
                    <th className="border-b border-slate-200 px-4 py-3 font-medium">Channel</th>
                    <th className="border-b border-slate-200 px-4 py-3 font-medium">Status</th>
                    <th className="border-b border-slate-200 px-4 py-3 font-medium">Created</th>
                    <th className="border-b border-slate-200 px-4 py-3 font-medium">Sent</th>
                    <th className="border-b border-slate-200 px-4 py-3 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 align-top last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{item.event_type.replaceAll("_", " ")}</div>
                        <div className="text-xs text-slate-500 font-mono">{item.resource_type}:{item.resource_id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div>{item.recipient_name ?? "Unknown recipient"}</div>
                        <div className="text-xs text-slate-500 font-mono">{item.recipient_id?.slice(0, 8) ?? "n/a"}...</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-slate-700">
                          {item.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-slate-700">
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{new Date(item.created_at).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-slate-700">{item.sent_at ? new Date(item.sent_at).toLocaleString("en-IN") : "Not sent"}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.error_message ? (
                          <div className="max-w-xs text-xs text-rose-700">{item.error_message}</div>
                        ) : (
                          <pre className="max-w-xs overflow-hidden text-wrap text-xs text-slate-500">
                            {JSON.stringify(item.payload_json, null, 2)}
                          </pre>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {notifications.pagination.total_pages > 1 ? (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
                <p>
                  Page {notifications.pagination.page} of {notifications.pagination.total_pages}
                  <span className="ml-2 text-xs text-slate-400">({notifications.pagination.total} total)</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                    disabled={page <= 1}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((currentPage) => Math.min(notifications.pagination.total_pages, currentPage + 1))}
                    disabled={page >= notifications.pagination.total_pages}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
