import React, { useState } from "react";
import {
  useReactTable, getCoreRowModel, flexRender,
  getFilteredRowModel, createColumnHelper
} from "@tanstack/react-table";
import { useNavigate } from 'react-router-dom';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Icon } from "@iconify-icon/react";



const StudentTable = ({ students, columnVisibility, setColumnVisibility }) => {
  const navigate = useNavigate();
  const [globalFilter, setGlobalFilter] = React.useState("");


  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'workshop':
        return 'text-[#6B7280] bg-[#F3F4F6] border border-[#6B7280] rounded-md px-2 py-1 capitalize';
      case 'normal progress':
        return 'text-[#0F766E] bg-[#CCFBF1] border border-[#0F766E] rounded-md px-2 py-1 capitalize';
      case 'admitted':
        return 'text-[#15803D] bg-[#DCFCE7] border border-[#15803D] rounded-md px-2 py-1 capitalize';
      default:
        return 'px-2 py-1';
    }
  };

  const handleOpenProfile = (studentId) => {
    console.log("Navigating to student:", studentId);
    navigate(`/students/profile/${studentId}`);
  };

  console.log('students', students);

  const columnHelper = createColumnHelper();
  const columns = [
    columnVisibility?.fullname && {
      accessorKey: "fullName",
      header: "Fullname",
      cell: ({ row }) => (
        <span>
          {row.original.fullName}
        </span>
      )
    },
    columnVisibility?.registrationNumber && {
      accessorKey: "registrationNumber",
      header: "Registration Number",
      cell: ({ row }) => (
        <span>
          {row.original.registrationNumber || "N/A"}
        </span>
      )
    },
    columnVisibility?.email && {
      accessorKey: "email",
      header: "Email Address"
    },
    columnVisibility?.campus && {
      accessorKey: "campus",
      header: "Campus",
      cell: (info) => {
        return (
          <span>{info.row.original.campus?.name}</span>
        );
      }
    },
    columnVisibility?.schoolCode && {
      accessorKey: "schoolCode",
      header: "School Code",
      cell: (info) => {


        return (
          <div className="text-sm flex flex-row text-center items-center gap-1 justify-start"> <span>{info.row.original.school?.code}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Icon
                    icon="tdesign:info-circle-filled"
                    className="w-4 h-4 mt-1 text-gray-400"
                  />
                </TooltipTrigger>
                <TooltipContent>{info.row.original.school?.name}</TooltipContent>
              </Tooltip>
            </TooltipProvider></div>
        );
      }
    },
    columnVisibility?.program && {
      accessorKey: "programLevel",
      header: "Program",
      cell: ({ row }) => (
        <span className="bg-[#FDD388] flex flex-row justify-center items-center gap-1 px-2 py-1 rounded-md capitalize">
          {row.original.programLevel}
        </span>
      )
    },
    columnVisibility?.status && {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span
          style={{
            color: row.original.statuses?.find(s => s.isCurrent)?.definition?.color || '#000',
            backgroundColor: `${row.original.statuses?.find(s => s.isCurrent)?.definition?.color}18` || '#00000018',
            border: `1px solid ${row.original.statuses?.find(s => s.isCurrent)?.definition?.color || '#000'}`,
            padding: '0.25rem 0.5rem',
            borderRadius: '0.375rem',
            display: 'inline-block'
          }}
          className="capitalize whitespace-normal"
        >
          {row.original.statuses?.find(s => s.isCurrent)?.definition?.name?.toLowerCase() || 'Unknown'}
        </span>
      )
    },
    {
      accessorKey: "timeInStatus",
      header: "Time in Status",
      cell: ({ row }) => {
        const currentStatus = row.original.statuses?.find(s => s.isCurrent);
        if (!currentStatus || !currentStatus.startDate) {
          return <span className="text-gray-400">N/A</span>;
        }

        const startDate = new Date(currentStatus.startDate);
        const now = new Date();
        const diffInDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));

        let timeDisplay;
        if (diffInDays < 1) {
          timeDisplay = "Today";
        } else if (diffInDays === 1) {
          timeDisplay = "1 day";
        } else if (diffInDays < 30) {
          timeDisplay = `${diffInDays} days`;
        } else if (diffInDays < 365) {
          const months = Math.floor(diffInDays / 30);
          timeDisplay = `${months} ${months === 1 ? 'month' : 'months'}`;
        } else {
          const years = Math.floor(diffInDays / 365);
          const remainingMonths = Math.floor((diffInDays % 365) / 30);
          timeDisplay = `${years} ${years === 1 ? 'year' : 'years'}${remainingMonths > 0 ? `, ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}` : ''}`;
        }

        return (
          <span className="text-sm">
            {timeDisplay}
          </span>
        );
      }
    },
    {
      accessorKey: "actions",
      header: "",
      cell: ({ row }) => (
        <button
          className="w-max px-2 h-6 rounded border border-[#E5E7EB] text-sm font-inter font-normal text-[#111827] shadow-[0px_1px_2px_0px_#0000000D] hover:bg-gray-50"
          onClick={() => handleOpenProfile(row.original.id)}
        >
          Open
        </button>
      )
    }
  ].filter(Boolean);


  const effectiveColumnVisibility = columnVisibility;

  const table = useReactTable({
    data: students,
    columns,
    state: {
      globalFilter,
      columnVisibility: effectiveColumnVisibility,
    },
    getFilteredRowModel: getFilteredRowModel(),
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
      <table className="w-full">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-[#111827] font-inter font-semibold text-[14px] leading-[20px]"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
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
                  className="px-4 py-2 whitespace-nowrap text-[#111827] font-inter font-normal text-[14px] leading-[20px]"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StudentTable;
