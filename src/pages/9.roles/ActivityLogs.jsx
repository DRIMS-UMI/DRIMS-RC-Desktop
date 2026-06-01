import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getPaginationRowModel,
  getFilteredRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import { useGetAllActivities } from '../../store/tanstackStore/services/queries';
import {
  Activity,
  Search,
  User,
  Clock,
  Info,
  RefreshCcw,
  FileText,
  Database,
  ShieldAlert,
  X,
  Calendar,
  Monitor,
  Globe,
  Tag,
} from 'lucide-react';
import moment from 'moment';

const columnHelper = createColumnHelper();

const getActionColor = (action) => {
  const a = (action || '').toLowerCase();
  if (a.includes('create') || a.includes('add')) return 'text-[#15803D] bg-[#DCFCE7] border border-[#15803D]';
  if (a.includes('update') || a.includes('edit')) return 'text-[#B45309] bg-[#FEF3C7] border border-[#B45309]';
  if (a.includes('delete') || a.includes('remove')) return 'text-red-600 bg-red-50 border border-red-300';
  if (a.includes('login')) return 'text-[#0EA5E9] bg-[#F0F9FF] border border-[#0EA5E9]';
  return 'text-gray-500 bg-gray-50 border border-gray-300';
};

const getEntityIcon = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('student')) return <User className="w-4 h-4" />;
  if (t.includes('book') || t.includes('thesis')) return <FileText className="w-4 h-4" />;
  if (t.includes('proposal')) return <FileText className="w-4 h-4" />;
  if (t.includes('user')) return <ShieldAlert className="w-4 h-4" />;
  return <Database className="w-4 h-4" />;
};

const columns = [
  columnHelper.accessor('timestamp', {
    header: 'Time',
    cell: (info) => (
      <div className="flex flex-col whitespace-nowrap">
        <span className="text-sm font-[Inter-Medium] text-gray-700">
          {moment(info.getValue()).format('MMM DD, YYYY')}
        </span>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {moment(info.getValue()).format('hh:mm A')}
        </span>
      </div>
    ),
  }),
  columnHelper.accessor((row) => row.user?.name, {
    id: 'user',
    header: 'User',
    cell: (info) => (
      <div className="flex flex-col">
        <span className="text-sm font-[Inter-Medium] text-gray-800">
          {info.row.original.user?.name || 'System'}
        </span>
        <span className="text-xs text-gray-400">
          {info.row.original.user?.email || 'N/A'}
        </span>
      </div>
    ),
  }),
  columnHelper.accessor('action', {
    header: 'Action',
    cell: (info) => (
      <span
        className={`px-2 py-1 rounded-md text-xs font-[Inter-Regular] capitalize inline-block ${getActionColor(info.getValue())}`}
      >
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('entityType', {
    header: 'Entity',
    cell: (info) => (
      <div className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
        <span className="p-1 rounded bg-gray-100 text-gray-500">
          {getEntityIcon(info.getValue())}
        </span>
        {info.getValue()}
      </div>
    ),
  }),
  columnHelper.accessor('details', {
    header: 'Details',
    cell: (info) => (
      <div className="text-sm text-gray-500 break-words">
        {info.getValue() || 'No additional details'}
      </div>
    ),
  }),
];

const ActivityLogs = () => {
  const { data, isLoading, refetch } = useGetAllActivities();
  const [globalFilter, setGlobalFilter] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);

  const activities = data?.activities || [];

  const table = useReactTable({
    data: activities,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      pagination: {
        pageSize,
        pageIndex: currentPage - 1,
      },
      globalFilter,
    },
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const newState = updater({ pageIndex: currentPage - 1, pageSize });
        setCurrentPage(newState.pageIndex + 1);
        setPageSize(newState.pageSize);
      }
    },
    onGlobalFilterChange: setGlobalFilter,
    pageCount: Math.ceil(activities.length / pageSize),
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">System Activity Logs</h1>
          <p className="text-gray-500 text-sm mt-1 font-[Inter-Regular]">
            Track all administrative actions and system events across the platform.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-[Inter-Medium] px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Total Actions card */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-4 flex items-center gap-4 w-fit">
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-primary-600">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <p className="text-gray-400 text-xs font-[Inter-Regular] uppercase tracking-wider">Total Actions</p>
          <p className="text-2xl font-semibold text-gray-900">{activities.length}</p>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white py-4 rounded-lg shadow-md mb-8">
        {/* Search + page size */}
        <div className="flex items-center justify-between mb-4 gap-4 px-4">
          <div className="flex items-center gap-2 justify-between flex-1">
            <div className="relative w-1/3">
              <input
                type="text"
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
                placeholder="Search all columns..."
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
              className="block rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
            >
              {[10, 20, 30, 50].map((size) => (
                <option key={size} value={size}>
                  Show {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border mx-4 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-sm font-[Inter-Medium] text-gray-500 capitalize tracking-wider"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-4 text-center">
                    <div className="flex justify-center items-center h-40">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-4 font-[Inter-Regular] text-center text-gray-500">
                    No activity logs found matching your search.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedLog(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-4 align-top text-sm font-[Inter-Regular] text-gray-900"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {!isLoading && activities.length > 0 && (
          <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200 bg-white mt-4">
            <div className="flex font-[Roboto-Regular] items-center text-sm text-gray-500">
              Showing{' '}
              <span className="font-[Roboto-Medium] mx-1">
                {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
              </span>
              to{' '}
              <span className="font-[Roboto-Medium] mx-1">
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  activities.length
                )}
              </span>
              of{' '}
              <span className="font-[Roboto-Medium] mx-1">{activities.length}</span> results
            </div>
            <div className="flex items-center gap-2">
              <button
                className="border border-gray-300 rounded p-1 font-[Roboto-Regular] text-sm disabled:opacity-50"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </button>
              {Array.from({ length: table.getPageCount() }, (_, i) => i + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  className={`w-8 h-8 rounded text-sm ${
                    pageNumber === table.getState().pagination.pageIndex + 1
                      ? 'bg-blue-50 text-blue-600 font-[Roboto-Medium]'
                      : 'text-gray-500'
                  }`}
                  onClick={() => table.setPageIndex(pageNumber - 1)}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                className="border border-gray-300 rounded p-1 font-[Roboto-Regular] text-sm disabled:opacity-50"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary-500" />
              <span className="text-xs text-gray-500 font-[Inter-Regular]">
                Logs are automatically captured for all critical system changes.
              </span>
            </div>
          </div>
        )}
      </div>
      {/* View Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 font-[Inter-Medium]">Activity Details</h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body - scrollable */}
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {/* User */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-200 uppercase font-bold text-xs shrink-0">
                  {selectedLog.user?.name?.charAt(0) || 'S'}
                </div>
                <div>
                  <p className="text-sm font-[Inter-Medium] text-gray-800">{selectedLog.user?.name || 'System'}</p>
                  <p className="text-xs text-gray-400">{selectedLog.user?.email || 'N/A'}</p>
                </div>
              </div>

              <div className="border-t border-gray-100" />

              {/* Grid of metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 font-[Inter-Regular] uppercase tracking-wider mb-1">Action</p>
                  <span className={`px-2 py-1 rounded-md text-xs font-[Inter-Regular] capitalize inline-block ${getActionColor(selectedLog.action)}`}>
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-[Inter-Regular] uppercase tracking-wider mb-1">Entity</p>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="p-1 rounded bg-gray-100 text-gray-500">
                      {getEntityIcon(selectedLog.entityType)}
                    </span>
                    {selectedLog.entityType}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-[Inter-Regular] uppercase tracking-wider mb-1">Date</p>
                  <div className="flex items-center gap-1 text-sm text-gray-700">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {moment(selectedLog.timestamp).format('MMM DD, YYYY')}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-[Inter-Regular] uppercase tracking-wider mb-1">Time</p>
                  <div className="flex items-center gap-1 text-sm text-gray-700">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {moment(selectedLog.timestamp).format('hh:mm:ss A')}
                  </div>
                </div>
                {selectedLog.ipAddress && (
                  <div>
                    <p className="text-xs text-gray-400 font-[Inter-Regular] uppercase tracking-wider mb-1">IP Address</p>
                    <div className="flex items-center gap-1 text-sm text-gray-700">
                      <Globe className="w-3.5 h-3.5 text-gray-400" />
                      {selectedLog.ipAddress}
                    </div>
                  </div>
                )}
                {selectedLog.deviceId && (
                  <div>
                    <p className="text-xs text-gray-400 font-[Inter-Regular] uppercase tracking-wider mb-1">Device ID</p>
                    <div className="flex items-center gap-1 text-sm text-gray-700">
                      <Monitor className="w-3.5 h-3.5 text-gray-400" />
                      {selectedLog.deviceId}
                    </div>
                  </div>
                )}
              </div>

              {/* Browser agent */}
              {selectedLog.browserAgent && (
                <div>
                  <p className="text-xs text-gray-400 font-[Inter-Regular] uppercase tracking-wider mb-1">Browser / User Agent</p>
                  <p className="text-xs text-gray-600 bg-gray-50 rounded p-2 break-words font-mono">{selectedLog.browserAgent}</p>
                </div>
              )}

              {/* Details */}
              <div>
                <p className="text-xs text-gray-400 font-[Inter-Regular] uppercase tracking-wider mb-1">Details</p>
                <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-700 break-words font-mono whitespace-pre-wrap">
                  {selectedLog.details
                    ? (() => {
                        try {
                          return JSON.stringify(JSON.parse(selectedLog.details), null, 2);
                        } catch {
                          return selectedLog.details;
                        }
                      })()
                    : 'No additional details'}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-[Inter-Medium] px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogs;
