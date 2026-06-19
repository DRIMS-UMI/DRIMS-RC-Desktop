/* eslint-disable react/prop-types */
import { useState, useMemo } from "react";
import { FiSearch } from "react-icons/fi";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getPaginationRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import StudentProgressPieChart from "./StudentProgressPieChart";
import { useNavigate } from "react-router-dom";
import { useGetAssignedStudents } from "../../store/tanstackStore/services/queries";
import StudentDetailDrawer from "./StudentDetailDrawer";

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

const StudentListModal = ({ isOpen, onClose, students, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed -inset-7  bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-[Roboto-Medium]">{title}</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <iconify-icon icon="material-symbols:close" width="24" height="24"></iconify-icon>
          </button>
        </div>
        
        <div className="divide-y">
          {students.map((student) => (
            <div key={student.id} className="py-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-[Roboto-Medium] text-gray-900">{student.fullname}</p>
                  <p className="text-sm text-gray-500">{student.email}</p>
                </div>
                <span
                  style={{
                    color: student.statusColor,
                    backgroundColor: `${student.statusColor}18`,
                    border: `1px solid ${student.statusColor}`,
                    padding: "0.25rem 0.5rem",
                    borderRadius: "0.375rem",
                  }}
                  className="text-sm capitalize"
                >
                  {student.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SupervisorTasks = ({ supervisorData }) => {
  let navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(5);
  const [activeTab, setActiveTab] = useState("assigned");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    students: [],
    title: ""
  });
  console.log(supervisorData);

  const { data: assignedStudentsData, isLoading } = useGetAssignedStudents(
    supervisorData?.supervisor?.id
  );

  console.log("assignedStudentsData", assignedStudentsData);
  // Transform assigned students data
  const studentsData = useMemo(() => {
    if (!assignedStudentsData?.students) return [];

    return assignedStudentsData.students.map((student) => {
      // Calculate total time from admission
      const admissionDate = new Date(student.createdAt);
      const now = new Date();
      const diffInDays = Math.floor((now - admissionDate) / (1000 * 60 * 60 * 24));
      const years = Math.floor(diffInDays / 365);
      const months = Math.floor((diffInDays % 365) / 30);
      const days = diffInDays % 30;

      let timeFromAdmission = '';
      if (years > 0) {
        timeFromAdmission += `${years} year${years > 1 ? 's' : ''} `;
      }
      if (months > 0) {
        timeFromAdmission += `${months} month${months > 1 ? 's' : ''} `;
      }
      if (days > 0 && years === 0 && months === 0) {
        timeFromAdmission += `${days} day${days > 1 ? 's' : ''}`;
      }

      const currentStatus = student.statuses.find(status => status.isCurrent);
      
      // Find previous status with most recent endDate
      const previousStatus = student.statuses
        .filter(status => !status.isCurrent)
        .sort((a, b) => new Date(b.endDate) - new Date(a.endDate))[0];

      return {
        id: student.id,
        fullname: student.fullName,
        email: student.email,
        category: student.programLevel,
        status: currentStatus?.definition?.name || "Unknown",
        statusColor: currentStatus?.definition?.color || "#000",
        isAssigned: true,
        createdAt: student.createdAt,
        previousStatus: previousStatus?.definition?.name || "None",
        timeFromAdmission: timeFromAdmission.trim()
      };
    });
  }, [assignedStudentsData]);

  // Filter active students (not graduated)
  const activeStudents = useMemo(() => {
    return studentsData.filter(student => 
      student.status.toLowerCase() !== 'graduated'
    );
  }, [studentsData]);

  // Get data based on active tab
  const displayData = useMemo(() => {
    return activeTab === 'assigned' ? activeStudents : studentsData;
  }, [activeTab, activeStudents, studentsData]);

  const handleViewStudent = (studentId) => {
    setSelectedStudentId(studentId);
    setIsDrawerOpen(true);
  };

  const handleViewStudentsByStatus = (status, title) => {
    const filteredStudents = studentsData.filter(
      s => s.status.toLowerCase() === status.toLowerCase()
    );
    setModalConfig({
      isOpen: true,
      students: filteredStudents,
      title
    });
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "fullname",
        header: "Fullname",
        cell: (info) => <span className="capitalize">{info.getValue()}</span>,
      },
      {
        accessorKey: "email",
        header: "Email Address",
        cell: (info) => <span>{info.getValue()}</span>,
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: (info) => (
          <span className="inline-flex h-hug24px rounded-md border py-4px px-9px bg-accent2-300 items-center justify-center whitespace-nowrap text-sm capitalize">
            {info.getValue()}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: (info) => {
          const status = info.getValue();
          const statusColor = info.row.original.statusColor;

          return (
            <span
              style={{
                color: statusColor || "#000",
                backgroundColor: `${statusColor}18` || "#00000018",
                border: `1px solid ${statusColor || "#000"}`,
                padding: "0.25rem 0.5rem",
                borderRadius: "0.375rem",
                display: "inline-block",
              }}
              className="capitalize"
            >
              {status || "Unknown"}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: " ",
        cell: (info) => (
          <button 
            onClick={() => handleViewStudent(info.row.original.id)}
            className="rounded border border-semantic-bg-border shadow-sm py-4px px-8px hover:bg-gray-50 font-[Inter-SemiBold] text-sm"
          >
            View
          </button>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: displayData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      pagination: {
        pageSize,
        pageIndex: 0,
      },
      globalFilter: searchQuery,
    },
    onGlobalFilterChange: setSearchQuery,
  });

  // Get counts for the tabs
  const assignedCount = activeStudents.length;
  const totalCount = studentsData.length;

  // Get current semester based on month
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11
  const semester = currentMonth >= 8 ? 2 : 1; // August onwards is semester 2

  // Get counts for different statuses
  const normalProgressCount = studentsData.filter(s => s.status.toLowerCase() === "normal progress").length;
  const underExaminationCount = studentsData.filter(s => s.status.toLowerCase() === "under examination").length;
  const bookSubmittedCount = studentsData.filter(s => s.status.toLowerCase() === "book submitted").length;
  const deferredCount = studentsData.filter(s => s.status.toLowerCase() === "deferred").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg font-semibold text-gray-600">
          Loading students data...
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 space-y-6 ">
      {/* Section 1: Overview Statistics */}
      <div className="grid grid-cols-12 gap-4">
        {/* Total Students Card */}
        <div className="col-span-3 flex flex-col justify-between bg-white rounded-lg p-4 shadow-sm">
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-[Roboto-Medium] text-gray-900">
              Total Students
            </h3>
            <p className="text-sm font-[Roboto-Regular] text-gray-500">
              These are the total students assigned to this supervisor
            </p>
          </div>

          <div className="w-full text-center">
            <span className="text-6xl font-[Roboto-Regular] text-gray-900">
              {studentsData.length}
            </span>
          </div>

          <div className="text-sm font-[Roboto-Regular] text-gray-500 mt-2">
            Current:{" "}
            <span className="font-[Roboto-Medium] text-gray-900">
              Semester {semester} {currentYear}
            </span>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="col-span-5 grid grid-cols-2 gap-4">
          {/* Not Submitted Book */}
          <div className="bg-white flex flex-col justify-between rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-[6px] items-center">
                <span className="text-2xl font-[Roboto-Medium] text-gray-900">
                  {normalProgressCount}
                </span>
                <p className="text-sm text-gray-500 font-[Roboto-Regular]">
                  Students have not Submitted Book
                </p>
              </div>
            </div>
            <button 
              onClick={() => handleViewStudentsByStatus("normal progress", "Students who have not Submitted Book")}
              disabled={normalProgressCount === 0}
              className={`text-xs font-[Roboto-Regular] text-primary-900 rounded-[3.33px] py-[3.33px] border border-secondary-600 ${
                normalProgressCount === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:text-primary-700 bg-secondary-100'
              }`}
            >
              View Students
            </button>
          </div>

          {/* Failed Students */}
          <div className="bg-white flex flex-col justify-between rounded-lg p-4 gap-4 shadow-sm">
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-[6px] items-center">
                <span className="text-2xl font-[Roboto-Medium] text-gray-900">
                  {underExaminationCount}
                </span>
                <p className="text-sm text-gray-500 font-[Roboto-Regular]">
                  Students have failed, need to Resubmit
                </p>
              </div>
            </div>
            <button 
              onClick={() => handleViewStudentsByStatus("under examination", "Students who need to Resubmit")}
              disabled={underExaminationCount === 0}
              className={`text-xs font-[Roboto-Regular] text-primary-900 rounded-[3.33px] py-[3.33px] border border-secondary-600 ${
                underExaminationCount === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:text-primary-700 bg-secondary-100'
              }`}
            >
              View Students
            </button>
          </div>

          {/* Scheduled for Viva */}
          <div className="bg-white flex flex-col justify-between rounded-lg p-4 gap-4 shadow-sm">
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-[6px] items-center">
                <span className="text-2xl font-[Roboto-Medium] text-gray-900">
                  {bookSubmittedCount}
                </span>
                <p className="text-sm text-gray-500 font-[Roboto-Regular]">
                  Students have been scheduled for Viva
                </p>
              </div>
            </div>
            <button 
              onClick={() => handleViewStudentsByStatus("book submitted", "Students Scheduled for Viva")}
              disabled={bookSubmittedCount === 0}
              className={`text-xs font-[Roboto-Regular] text-primary-900 rounded-[3.33px] py-[3.33px] border border-secondary-600 ${
                bookSubmittedCount === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:text-primary-700 bg-secondary-100'
              }`}
            >
              View Students
            </button>
          </div>

          {/* Deferred Proposal */}
          <div className="bg-white flex flex-col justify-between rounded-lg p-4 gap-4 shadow-sm">
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-[6px] items-center">
                <span className="text-2xl font-[Roboto-Medium] text-gray-900">{deferredCount}</span>
                <p className="text-sm text-gray-500 font-[Roboto-Regular]">
                  Students have deferred Proposal
                </p>
              </div>
            </div>
            <button 
              onClick={() => handleViewStudentsByStatus("deferred", "Students with Deferred Proposal")}
              disabled={deferredCount === 0}
              className={`text-xs font-[Roboto-Regular] text-primary-900 rounded-[3.33px] py-[3.33px] border border-secondary-600 ${
                deferredCount === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:text-primary-700 bg-secondary-100'
              }`}
            >
              View Students
            </button>
          </div>
        </div>

        {/* Progress Status Chart */}
        <div className="col-span-4 bg-white rounded-lg shadow-sm relative "> 
          <StudentProgressPieChart studentsData={studentsData} />
        </div>
      </div>

      {/* Section 2: Students Table */}
      <div className="bg-white rounded-lg shadow-sm">
        {/* Students Tabs */}
        <div className="px-4  border-b">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("assigned")}
              className={` whitespace-nowrap py-4 px-1 border-b-2 font-[Roboto-Medium] text-sm ${
                activeTab === "assigned"
                  ? "text-primary-600 border-b-2 border-primary-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Students Assigned ({assignedCount})
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={` whitespace-nowrap py-4 px-1 border-b-2 font-[Roboto-Medium] text-sm ${
                activeTab === "all"
                  ? "text-primary-600 border-b-2 border-primary-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              All Students ({totalCount})
            </button>
          </nav>
        </div>

        {/* Search and Controls */}
        <div className="p-4 flex justify-between items-center border-b">
          <div className="w-[240px]">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by Name..."
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <span className="text-sm font-[Inter-Regular] text-gray-600 mr-2">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const newSize = Number(e.target.value);
                  setPageSize(newSize);
                  table.setPageSize(newSize);
                }}
                className="border border-gray-300 rounded-lg px-2 py-1 font-[Inter-Regular] text-sm"
              >
                {[5, 10, 20, 30, 40, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() =>
                navigate(
                  `/faculty/assign-students/${supervisorData?.supervisor?.id}`
                )
              }
              className="px-3 py-1 bg-primary-500 text-white rounded-lg font-[Inter-Medium] text-sm hover:bg-primary-600 flex items-center gap-2"
            >
              <span>Assign Student</span>
              <span className="text-lg">+</span>
            </button>
          </div>
        </div>

        {/* Table Structure */}
        <div className="overflow-x-auto">
          <table className="w-full  divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-[#111827] font-[Inter-SemiBold] text-sm leading-[20px]"
                    >
                      {flexRender(
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
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-2 whitespace-nowrap text-[#111827] font-[Inter-Regular] text-sm"
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
        </div>

        {/* Pagination Controls */}
        <div className="px-6 py-3 mb-8 flex items-center justify-between border-t border-gray-200 bg-white">
          <div className="flex font-[Roboto-Regular] items-center text-sm text-gray-500">
            Showing{" "}
            <span className="font-[Roboto-Medium] mx-1">
              {table.getState().pagination.pageSize *
                table.getState().pagination.pageIndex +
                1}
            </span>
            to{" "}
            <span className="font-[Roboto-Medium] mx-1">
              {Math.min(
                (table.getState().pagination.pageIndex + 1) *
                  table.getState().pagination.pageSize,
                table.getPrePaginationRowModel().rows.length
              )}
            </span>
            of{" "}
              <span className="font-[Roboto-Medium] mx-1">
              {table.getPrePaginationRowModel().rows.length}
            </span>{" "}
            results
          </div>
          <div className="flex items-center gap-2">
          <button
          className="border border-gray-300 rounded p-1 font-[Roboto-Regular] text-sm disabled:opacity-50"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </button>
            {Array.from({ length: table.getPageCount() }, (_, i) => i + 1).map(pageNumber => (
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
        </div>
      </div>

      <StudentDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        studentId={selectedStudentId}
        studentData={studentsData}
      />

      <StudentListModal 
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({...modalConfig, isOpen: false})}
        students={modalConfig.students}
        title={modalConfig.title}
      />
    </div>
  );
};

export default SupervisorTasks;
