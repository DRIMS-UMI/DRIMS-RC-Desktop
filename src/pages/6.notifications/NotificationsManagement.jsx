/* eslint-disable react/prop-types */
import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { FiSearch } from "react-icons/fi";
import NotificationDrawer from "./NotificationDrawer";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import { useGetNotifications } from "@/store/tanstackStore/services/queries";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

// Priority types and their colors
const PRIORITY_TYPES = {
  Urgent: "text-red-500",
  Important: "text-orange-500",
  Anytime: "text-green-500",
};

// Status types and their colors
const STATUS_TYPES = {
  New: "text-blue-500",
  Read: "text-gray-500",
  Actioned: "text-green-500",
  Archived: "text-gray-400",
};

// Component: Search bar with icon
const SearchBar = ({ value, onChange, placeholder = "Search" }) => {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <FiSearch className="h-4 w-4 text-gray-400" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        placeholder={placeholder}
      />
    </div>
  );
};

// Main component: Notifications management page
const NotificationsManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedNotificationId, setSelectedNotificationId] = useState(null);

  // Fetch notifications data from API
  const { data, isLoading, error } = useGetNotifications();

  console.log("data", data);

  // Use the fetched data
  const notificationsData = data?.notifications || [];

  const handleRowClick = (notificationId) => {
    setSelectedNotificationId(notificationId);
    setIsDrawerOpen(true);
  };

  // Table columns definition
  const columns = useMemo(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        cell: (info) => (

          <div className="max-w-xs whitespace-pre-wrap break-words text-xs font-[Inter-Medium]">
            {info.getValue()}
          </div>

        ),
      },
      {
        accessorKey: "studentName",
        header: "Student",
        cell: (info) => (
          <button
            onClick={() => handleRowClick(info.row.original.id)}
            className="text-left hover:text-primary-600"
          >
            {info.row.original?.studentStatus?.student?.fullName}
          </button>
        ),
      },
      {
        accessorKey: "studentStatus.definition.name",
        header: "Progress",
        cell: (info) => (
          <div className="flex items-center">
            <span className="px-2 py-1 text-xs font-[Inter-Regular] capitalize rounded-sm bg-blue-100 text-blue-800">
              {info.row.original?.studentStatus?.definition?.name || "N/A"}
            </span>
          </div>
        ),
      },


      {
        accessorKey: "recipientName",
        header: "Recipient",
        cell: (info) => (
          <div>
            <div className="text-gray-700 font-medium">
              {info.getValue() || "N/A"}
            </div>
            <div className="text-gray-500 text-xs">
              {info.row.original.recipientEmail || "N/A"}
            </div>
          </div>
        ),
      },



      {
        accessorKey: "statusType",
        header: "Status",
        cell: (info) => {
          const status = info.getValue() || "PENDING";
          const statusClasses = {
            PENDING: "bg-yellow-100 text-yellow-800",
            SENT: "bg-green-100 text-green-800",
            FAILED: "bg-red-100 text-red-800",
            CANCELLED: "bg-gray-100 text-gray-800"
          };
          return (
            <span className={`px-2 py-1 rounded-sm text-xs font-[Inter-Regular] ${statusClasses[status] || "bg-blue-100 text-blue-800"}`}>
              {status}
            </span>
          );
        },
      },
      {
        accessorKey: "scheduledFor",
        header: "Scheduled For",
        cell: (info) => {
          const scheduledFor = info.getValue();
          return (
            <span className="text-xs font-[Inter-Medium] text-gray-700">
              {scheduledFor
                ? new Date(scheduledFor).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Not scheduled"}
            </span>
          );
        },
      },
      {
        accessorKey: "sentAt",
        header: "Sent At",
        cell: (info) => {
          const sentAt = info.getValue();
          return (
            <span className="text-xs font-[Inter-Medium] text-gray-700">
              {sentAt
                ? new Date(sentAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Not sent yet"}
            </span>
          );
        },
      },

      {
        accessorKey: "actions",
        header: " ",
        cell: (info) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRowClick(info.row.original.id);
            }}
            className="rounded border border-semantic-bg-border shadow-sm py-1 px-3 hover:bg-gray-50"
          >
            Open
          </button>
        ),
      },
    ],
    []
  );

  // Filter data based on search query
  const filteredNotificationsData = useMemo(() => {
    let filtered = notificationsData;

    if (searchQuery) {
      filtered = filtered.filter((item) =>
        item.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.remarks?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [searchQuery, notificationsData]);

  // Initialize table
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    data: filteredNotificationsData,
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      globalFilter: searchQuery,
      pagination,
    },
    onPaginationChange: setPagination,
    onGlobalFilterChange: setSearchQuery,
  });

  const getPageNumbers = () => {
    const pageCount = table.getPageCount();
    const currentPage = table.getState().pagination.pageIndex + 1;

    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, i) => i + 1);
    }

    const pages = [];

    if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) {
        pages.push(i);
      }
      pages.push("...");
      pages.push(pageCount);
    } else if (currentPage >= pageCount - 3) {
      pages.push(1);
      pages.push("...");
      for (let i = pageCount - 4; i <= pageCount; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      pages.push("...");
      pages.push(currentPage - 1);
      pages.push(currentPage);
      pages.push(currentPage + 1);
      pages.push("...");
      pages.push(pageCount);
    }

    return pages;
  };

  return (
    <div className="min-h-full">
      {/* Global Search */}
      <div className="flex px-6 justify-between items-center border-b border-gray-300 h-[89px]">
        <p className="text-sm font-[Inter-SemiBold]  text-gray-900">Research Centre Portal</p>
        <p className="text-sm font-[Inter-Medium]  text-gray-600">Digital Research Information Management System</p>
      </div>



      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4">
        <h1 className="text-2xl font-semibold text-gray-900">
          Notifications Management
        </h1>
        <div className="text-sm text-gray-500">
          Last login: {format(new Date(), "MM-dd-yyyy hh:mm:ssaa")}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-4 gap-4 px-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm text-center">
          <h2 className="text-lg font-semibold text-gray-900">{notificationsData.length}</h2>
          <p className="text-sm text-gray-500">Total Notifications</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            {notificationsData.filter(item => item.statusType === 'PENDING').length}
          </h2>
          <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
            Pending
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-gray-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Notifications waiting to be sent</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            {notificationsData.filter(item => item.statusType === 'SENT').length}
          </h2>
          <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
            Sent
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-gray-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Notifications that have been sent</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            {notificationsData.filter(item => item.statusType === 'FAILED' || item.statusType === 'CANCELLED').length}
          </h2>
          <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
            Failed/Cancelled
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-gray-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Notifications that failed to send or were cancelled</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="px-6 py-4">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">System Notifications</h2>
          </div>

          {/* Search and Controls */}
          <div className="p-4 flex justify-between items-center border-b">
            <div className="w-[240px]">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search notifications"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Show:</span>
              <select
                value={pagination.pageSize}
                onChange={e => {
                  setPagination(old => ({
                    ...old,
                    pageSize: Number(e.target.value)
                  }))
                }}
                className="border border-gray-300 rounded shadow-sm py-1 px-2 text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              >
                {[5, 10, 15, 20].map(pageSize => (
                  <option key={pageSize} value={pageSize}>
                    {pageSize}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-6 text-center text-gray-500">Loading notifications...</div>
            ) : error ? (
              <div className="p-6 text-center text-red-500">Error loading notifications</div>
            ) : notificationsData.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No notifications found</div>
            ) : (
              <table className="w-full text-sm divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-3 py-2 text-left text-sm font-[Inter-Regular] text-gray-700 capitalize"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-3 py-1.5 whitespace-nowrap text-xs font-[Inter-Medium] text-gray-900"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {/* Pagination */}
          <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200 bg-white">
            <div className="flex items-center text-sm text-gray-500">
              Showing{" "}
              <span className="font-medium mx-1">
                {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
              </span>
              to{" "}
              <span className="font-medium mx-1">
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  table.getPrePaginationRowModel().rows.length
                )}
              </span>
              of{" "}
              <span className="font-medium mx-1">
                {table.getPrePaginationRowModel().rows.length}
              </span>{" "}
              results
            </div>
            <div className="flex items-center gap-2">
              <button
                className="border rounded p-1 text-sm disabled:opacity-50"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </button>
              {getPageNumbers().map((page, idx) => {
                if (page === "...") {
                  return (
                    <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    key={`page-${page}`}
                    className={`w-8 h-8 rounded text-sm ${page === table.getState().pagination.pageIndex + 1
                        ? "bg-blue-50 text-blue-600 font-medium"
                        : "text-gray-500 hover:bg-gray-50"
                      }`}
                    onClick={() => table.setPageIndex(page - 1)}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                className="border rounded p-1 text-sm disabled:opacity-50"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
      <NotificationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        notificationId={selectedNotificationId}
      />
    </div>
  );
};

export default NotificationsManagement;
