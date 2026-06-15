import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { useNavigate } from 'react-router-dom';
import { HiPlus } from "react-icons/hi";
import { MdOutlineFileUpload, MdSchool } from "react-icons/md";
import StudentTabs from "./StudentTabs";
import SStats from "./SStats";
import StudentTableControlPanel from "./StudentTableControlPanel";
import SSearch from "./SSearch";
import StudentTable from "./StudentTable";  
import SPageSize from "./SPageSize";
import StudentPagination from "./StudentPagination";
import { ROUTES } from '../../config/routes';
import { useGetAllStudents } from '../../store/tanstackStore/services/queries';
import { useGetDashboardStats } from "@/store/tanstackStore/services/queries";
import { useIsReadOnly } from "../../hooks/useIsReadOnly";
import { getFuzzyScore } from "../../utils/fuzzySearch";

const StudentsManagement = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(
    localStorage.getItem("selectedCategory") || "All Students"
  );
  const [pageSize, setPageSize] = useState(
    parseInt(localStorage.getItem("pageSize")) || 10
  );
  const [currentPage, setCurrentPage] = useState(
    parseInt(localStorage.getItem("currentPage")) || 1
  );
  const isReadOnly = useIsReadOnly();

  // Query to fetch all students
  const { data: studentsData, isLoading, error } = useGetAllStudents();
  
  // Query to fetch dashboard stats
  const { data: statsData } = useGetDashboardStats();

  // Manage column visibility state
  const [columnVisibility, setColumnVisibility] = useState({
    fullname: true,
    registrationNumber: true,
    email: true,
    campus: true,
    schoolCode: true,
    program: true,
    status: true,
    actions: true
  });

  // Save pagination state to localStorage
  useEffect(() => {
    localStorage.setItem("selectedCategory", selectedCategory);
    localStorage.setItem("pageSize", pageSize);
    localStorage.setItem("currentPage", currentPage);
  }, [selectedCategory, pageSize, currentPage]);

    // Filter students based on search, category and program level using useMemo
    const filteredStudents = useMemo(() => {
      const results = (studentsData?.students || [])
        .map(student => {
          const nameScore = getFuzzyScore(student?.fullName, searchTerm);
          const regScore = getFuzzyScore(student?.registrationNumber, searchTerm);
          const maxScore = Math.max(nameScore, regScore);
          return { student, score: maxScore };
        })
        .filter(({ student, score }) => {
          const matchesCategory = selectedCategory === "All Students" || 
                                student?.programLevel === selectedCategory;
          
          return matchesCategory && score >= 0.7;
        });

      if (searchTerm) {
        results.sort((a, b) => b.score - a.score);
      }

      return results.map(r => r.student);
    }, [studentsData?.students, selectedCategory, searchTerm]);
  
    // Pagination logic with useMemo
    const paginatedStudents = useMemo(() => {
      const startIndex = (currentPage - 1) * pageSize;
      let paginatedData = filteredStudents.slice(startIndex, startIndex + pageSize);
      
      if (paginatedData.length === 0 && filteredStudents.length > 0) {
        // Reset the current page when the selected page size is too large for the available data
        setCurrentPage(1);
        paginatedData = filteredStudents.slice(0, pageSize);
      }
      
      return paginatedData;
    }, [filteredStudents, currentPage, pageSize]);

  if (isLoading) {
    return <div className="p-6">Loading students...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Error loading students: {error.message}</div>;
  }



  return (
    <div className=" mx-auto space-y-6">
      {/* Search Bar */}
      {/* Top Search Bar */}
      <div className="flex items-center justify-between py-6 px-6 pb-0 w-full h-[88px] border-b border-gray-200">
        <p className="text-sm font-[Inter-Medium]  text-gray-900">Research Centre Portal</p>
        <p className="text-sm font-[Inter-Medium]  text-gray-600">Digital Research Information Management System</p>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center px-6 py-3">
        <h1 className="text-2xl font-semibold text-gray-800">Postgraduate Students Records</h1>
        <span className="text-sm text-gray-500">
          Last login: {format(new Date(), "MM-dd-yyyy hh:mm:ssaa")}
        </span>
      </div>

      {/* Stats */}
      <SStats stats={statsData} />

      {/* Table Control Panel */}
      <StudentTableControlPanel 
        visibleColumns={columnVisibility} 
        setVisibleColumns={setColumnVisibility} 
      />

      {/* Tabs, Search, Table, and Pagination */}
      <div className="bg-white p-6 rounded-lg shadow-md mx-6 mb-8">
        {/* Tabs */}
        <StudentTabs  
          selectedCategory={selectedCategory} 
          setSelectedCategory={setSelectedCategory}
          students={studentsData?.students || []}
        />

        {/* Search, Page Size, and Add Student Button */}
        <div className="flex justify-between items-center my-4">
          <SSearch searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          <div className="flex items-center gap-3">
            <SPageSize pageSize={pageSize} setPageSize={setPageSize} />
            {!isReadOnly && (
              <>
                <button
                  onClick={() => navigate("/students/upload-students")}
                  className="inline-flex items-center px-4 py-2 bg-[#23388F] text-white rounded-lg text-sm font-medium hover:bg-[#2d48b8] gap-2"
                >
                  <MdOutlineFileUpload className="w-5 h-5" />
                  Upload CSV/ Excel
                </button>
                <button
                  onClick={() => navigate(ROUTES.STUDENT.IMPORT_ACMIS)}
                  className="inline-flex items-center px-4 py-2 bg-[#F59E0B] text-white rounded-lg text-sm font-medium hover:bg-[#d98d0a] gap-2 shadow-sm transition-all"
                >
                  <MdSchool className="w-5 h-5" />
                  Import Student from ACMIS
                </button>
                <button
                  onClick={() => navigate(ROUTES.STUDENT.ADD)}
                  className="inline-flex items-center px-4 py-2 bg-[#23388F] text-white rounded-lg text-sm font-medium hover:bg-[#2d48b8] gap-2"
                >
                  <HiPlus className="w-5 h-5" />
                  Add Student Manually
                </button>
              </>
            )}
          </div>
        </div>


        {/* Student Table */}
        <StudentTable 
          students={paginatedStudents} 
          columnVisibility={columnVisibility}
          setColumnVisibility={setColumnVisibility}
        />

        {/* Pagination */}
        <StudentPagination
          totalItems={filteredStudents.length}
          pageSize={pageSize}
          setPageSize={setPageSize}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default StudentsManagement;
