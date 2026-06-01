import React, { useState, useMemo, useEffect, useRef } from 'react';
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryClient } from "../../utils/tanstack";
import {
  updateResultsApprovalDateService,
  updateResultsSentDateService,
  updateSenateApprovalDateService,
  sendResultsEmailService
} from "../../store/tanstackStore/services/api";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { IndeterminateCheckbox } from "@/components/ui/indeterminate-checkbox.jsx";
import * as XLSX from 'xlsx';

const columnHelper = createColumnHelper();

const getStudentMarks = (row) => {
  let textMarks = { internal: 0, external: 0 };
  const currentAssignments = row.examinerAssignments?.filter(a => a.isCurrent);
  currentAssignments?.forEach(a => {
    if (a.examiner?.type === 'Internal') textMarks.internal = a.grade || 0;
    if (a.examiner?.type === 'External') textMarks.external = a.grade || 0;
  });

  const currentViva = row.vivaHistory?.find(v => v.isCurrent);
  const vivaMarks = {
    internal: currentViva?.internalMark || 0,
    external: currentViva?.externalMark || 0
  };

  return { textMarks, vivaMarks };
};

function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const key = keyFn(item) || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

const GroupedReportTable = ({ items, reportsColumns, TableComponent }) => {
  const table = useReactTable({
    data: items,
    columns: reportsColumns,
    getCoreRowModel: getCoreRowModel(),
  });
  return <TableComponent table={table} />;
};

// Separate component for school tables to avoid Rules of Hooks violation
const SchoolTable = ({ schoolName, schoolData, onExport, onSendToSchool, onSenateApprove, currentAcademicYear, getColumnsForTab, isEmailLoading, isSenateLoading, tab = "results-approved-at-centre" }) => {
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data: schoolData,
    columns: getColumnsForTab(tab),
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleSenateApproveSelected = () => {
    const selectedBooks = Object.keys(rowSelection).map(index => schoolData[parseInt(index, 10)]);
    if (selectedBooks.length > 0) {
      onSenateApprove(selectedBooks);
    } else {
      toast.info("No items selected for senate approval.");
    }
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          {schoolName} ({schoolData.length} students)
        </h3>
        <div className="flex gap-2">
          <Button
            onClick={() => onExport(schoolName, schoolData)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export {schoolName}
          </Button>
          {tab === "results-approved-at-centre" && (
            <Button
              onClick={() => onSendToSchool(schoolName, schoolData)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isEmailLoading}
            >
              {isEmailLoading ? "Sending..." : `Send to ${schoolName}`}
            </Button>
          )}
          {tab === "results-sent" && (
            <Button
              onClick={handleSenateApproveSelected}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              disabled={isSenateLoading || Object.keys(rowSelection).length === 0}
            >
              {isSenateLoading ? "Approving..." : `Mark as Senate Approved (${Object.keys(rowSelection).length})`}
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    className="px-2 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-600 border border-gray-200"
                    style={{ width: header.getSize() }}
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
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className="px-2 py-2 text-xs border border-gray-200 text-center"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={table.getAllColumns().length} className="text-center py-8 text-gray-500">
                  No data available for this school.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const GradeManagementFinalSubmissionTable = ({ data, pageSize, setPageSize, currentPage, setCurrentPage, totalCount }) => {
  const [activeTab, setActiveTab] = useState("results-pending-approval");
  const [selectedBook, setSelectedBook] = useState(null);
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [rowSelection, setRowSelection] = useState({});
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [approvalDate, setApprovalDate] = useState("");
  const [isSendToSchoolDialogOpen, setIsSendToSchoolDialogOpen] = useState(false);
  const [selectedSchoolData, setSelectedSchoolData] = useState(null);
  const [emailRecipients, setEmailRecipients] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [isSenateApproveDialogOpen, setIsSenateApproveDialogOpen] = useState(false);
  const [senateApprovalDate, setSenateApprovalDate] = useState("");
  const [selectedSenateData, setSelectedSenateData] = useState(null);

  useEffect(() => {
    setRowSelection({});
  }, [activeTab]);

  useEffect(() => {
    // Set default approval date to today
    setApprovalDate(new Date().toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    // Set default senate approval date to today
    setSenateApprovalDate(new Date().toISOString().split('T')[0]);
  }, []);

  // Filter books based on criteria
  const filteredData = useMemo(() => {
    return data.filter(book => {
      const isCurrentBook = book.isCurrent === true;
      const hasFinalStatus = book.student?.statuses?.some(status =>
        status.definition?.name === 'final dissertation & compliance report received'
      );
      const isNotGraduated = !book.student?.statuses?.some(status =>
        status.isCurrent &&
        status.definition?.name === 'graduated'
      );
      return isCurrentBook && hasFinalStatus && isNotGraduated;
    });
  }, [data]);

  // Data subsets for each tab
  const pendingApprovalData = useMemo(() => {
    return filteredData.filter(book => {
      const hasResultsApprovedDate = book.student?.resultsApprovedDate;
      const hasResultsApprovedStatus = book.student?.statuses?.some(status =>
        status.definition?.name === 'results approved'
      );
      return !hasResultsApprovedDate && !hasResultsApprovedStatus;
    });
  }, [filteredData]);

  const approvedAtCentreData = useMemo(() => {
    return filteredData.filter(book => {
      const hasResultsApprovedDate = book.student?.resultsApprovedDate;
      const hasResultsApprovedStatus = book.student?.statuses?.some(status =>
        status.isCurrent && status.definition?.name === 'results approved'
      );
      const hasResultsSentDate = book.student?.resultsSentDate;

      return (hasResultsApprovedDate || hasResultsApprovedStatus) && !hasResultsSentDate;
    });
  }, [filteredData]);

  const resultsSentData = useMemo(() => {
    return filteredData.filter(book => {
      const hasResultsSentDate = book.student?.resultsSentDate;
      const hasResultsSentToSchoolsStatus = book.student?.statuses?.some(status =>
        status.isCurrent && status.definition?.name === 'results sent to schools'
      );
      const hasSenateApprovalDate = book.student?.senateApprovalDate;

      return (hasResultsSentDate || hasResultsSentToSchoolsStatus) && !hasSenateApprovalDate;
    });
  }, [filteredData]);

  const senateApprovalData = useMemo(() => {
    return filteredData.filter(book => {
      const hasSenateApprovalDate = book.student?.senateApprovalDate;
      const hasResultsApprovedBySenateStatus = book.student?.statuses?.some(status =>
        status.isCurrent && status.definition?.name === 'results approved by senate'
      );

      return hasSenateApprovalDate || hasResultsApprovedBySenateStatus;
    });
  }, [filteredData]);

  // Group data for reports tab
  const groupedReportsData = useMemo(() => {
    // Use student.course and student.school if available, fallback to registrationNumber and campus.location
    return groupBy(filteredData, row => row.student?.course?.code || row.student?.course?.title || row.student?.registrationNumber?.split('/')[2] || 'Unknown');
  }, [filteredData]);

  // For each course, group by school (or campus/location)
  const groupedByCourseAndSchool = useMemo(() => {
    const result = {};
    Object.entries(groupedReportsData).forEach(([course, items]) => {
      result[course] = groupBy(items, row => row.student?.school?.name || row.student?.campus?.location || 'Unknown');
    });
    return result;
  }, [groupedReportsData]);

  // Compute the current academic year from filteredData
  const currentAcademicYear = useMemo(() => {
    // Get all academic years from filteredData
    const years = filteredData
      .map(book => book.student?.academicYear)
      .filter(Boolean);
    if (years.length === 0) return '';
    // Option 1: Use the most common year
    const freq = {};
    years.forEach(y => { freq[y] = (freq[y] || 0) + 1; });
    const mostCommon = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
    return mostCommon;
  }, [filteredData]);

  // Reports table columns based on the image
  const reportsColumns = useMemo(() => [
    columnHelper.accessor((row, index) => index + 1, {
      header: "No",
      id: "no",
      size: 40,
    }),
    columnHelper.accessor(row => row.student?.fullName || "N/A", {
      header: "NAME",
      id: "studentName",
      size: 160,
    }),
    columnHelper.accessor("student.registrationNumber", {
      header: "REG. NO",
      id: "registrationNo",
      cell: info => info.getValue() || "N/A",
      size: 120,
    }),
    columnHelper.accessor(row => row?.student?.gender === "male" ? "M" : "F" || "N/A", {
      header: "GENDER",
      id: "gender",
      size: 60,
    }),
    columnHelper.accessor(row => row.student?.course?.code || row.student?.course?.title || "N/A", {
      header: "COURSE",
      id: "course",
      size: 80,
    }),
    columnHelper.accessor(row => `${row.student?.academicYear}` || "N/A", {
      header: "YEAR OF ENROLLMENT",
      id: "yearOfEnrollment",
      size: 120,
    }),
    columnHelper.accessor(row => row.student?.campus?.location || "N/A", {
      header: "BRANCH",
      id: "campus",
      size: 80,
    }),
    columnHelper.group({
      header: 'L.E. text',
      columns: [
        columnHelper.accessor(row => getStudentMarks(row).textMarks.internal, {
          header: '(100%)',
          id: 'le_text_100',
          cell: info => info.getValue()?.toFixed(0),
          size: 60,
        }),
        columnHelper.accessor(row => getStudentMarks(row).textMarks.internal * 0.2, {
          header: '(20%)',
          id: 'le_text_20',
          cell: info => info.getValue()?.toFixed(0),
          size: 60,
        }),
      ]
    }),
    columnHelper.group({
      header: 'E.E. text',
      columns: [
        columnHelper.accessor(row => getStudentMarks(row).textMarks.external, {
          header: '(100%)',
          id: 'ee_text_100',
          cell: info => info.getValue()?.toFixed(0),
          size: 60,
        }),
        columnHelper.accessor(row => getStudentMarks(row).textMarks.external * 0.4, {
          header: '(40%)',
          id: 'ee_text_40',
          cell: info => info.getValue()?.toFixed(0),
          size: 60,
        }),
      ]
    }),
    columnHelper.accessor(row => (getStudentMarks(row).textMarks.internal * 0.2) + (getStudentMarks(row).textMarks.external * 0.4), {
      header: 'Total text mark (out of 60)',
      id: 'total_text_mark',
      cell: info => info.getValue()?.toFixed(0),
      size: 100,
    }),
    columnHelper.group({
      header: 'L.E. viva',
      columns: [
        columnHelper.accessor(row => getStudentMarks(row).vivaMarks.internal, {
          header: '(100%)',
          id: 'le_viva_100',
          cell: info => info.getValue()?.toFixed(0),
          size: 60,
        }),
        columnHelper.accessor(row => getStudentMarks(row).vivaMarks.internal * 0.2, {
          header: '(20%)',
          id: 'le_viva_20',
          cell: info => info.getValue()?.toFixed(0),
          size: 60,
        }),
      ]
    }),
    columnHelper.group({
      header: 'E.E. viva',
      columns: [
        columnHelper.accessor(row => getStudentMarks(row).vivaMarks.external, {
          header: '(100%)',
          id: 'ee_viva_100',
          cell: info => info.getValue()?.toFixed(0),
          size: 60,
        }),
        columnHelper.accessor(row => getStudentMarks(row).vivaMarks.external * 0.2, {
          header: '(20%)',
          id: 'ee_viva_20',
          cell: info => info.getValue()?.toFixed(0),
          size: 60,
        }),
      ]
    }),
    columnHelper.accessor(row => (getStudentMarks(row).vivaMarks.internal * 0.2) + (getStudentMarks(row).vivaMarks.external * 0.2), {
      header: 'Total viva mark (out of 40)',
      id: 'total_viva_mark',
      cell: info => info.getValue()?.toFixed(0),
      size: 100,
    }),
    columnHelper.accessor(row => {
      const { textMarks, vivaMarks } = getStudentMarks(row);
      const textTotal = (textMarks.internal * 0.2) + (textMarks.external * 0.4);
      const vivaTotal = (vivaMarks.internal * 0.2) + (vivaMarks.external * 0.2);
      return textTotal + vivaTotal;
    }, {
      header: 'Final Dissertation mark (out of 100)',
      id: 'final_dissertation_mark',
      cell: info => info.getValue()?.toFixed(0),
      size: 120,
    }),
    columnHelper.accessor(row => row.vivaHistory?.find(v => v.isCurrent)?.status || 'Complete', {
      header: 'Status',
      id: 'status',
      size: 100,
    })
  ], []);

  // Mutations
  const updateResultsApprovalMutation = useMutation({
    mutationFn: (data) => updateResultsApprovalDateService(selectedBook.student.id, data),
    onSuccess: () => {
      toast.success("Results approval date updated successfully");
      setIsDateDialogOpen(false);
      queryClient.invalidateQueries(['books']);
    },
    onError: (error) => toast.error(`Error: ${error.message}`)
  });

  const updateResultsSentMutation = useMutation({
    mutationFn: (data) => updateResultsSentDateService(selectedBook.student.id, data),
    onSuccess: () => {
      toast.success("Results sent date updated successfully");
      setIsDateDialogOpen(false);
      queryClient.invalidateQueries(['books']);
    },
    onError: (error) => toast.error(`Error: ${error.message}`)
  });

  const updateSenateApprovalMutation = useMutation({
    mutationFn: (data) => updateSenateApprovalDateService(selectedBook.student.id, data),
    onSuccess: () => {
      toast.success("Senate approval date updated successfully");
      setIsDateDialogOpen(false);
      queryClient.invalidateQueries(['books']);
    },
    onError: (error) => toast.error(`Error: ${error.message}`)
  });

  const approveMultipleMutation = useMutation({
    mutationFn: ({ booksToApprove, approvalDate }) => {
      const promises = booksToApprove.map(book =>
        updateResultsApprovalDateService(book.student.id, approvalDate)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast.success("Selected results approved successfully.");
      setRowSelection({});
      setIsApproveDialogOpen(false);

      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
    onError: (error) => toast.error(`Error during approval: ${error.message}`)
  });

  const sendToSchoolMultipleMutation = useMutation({
    mutationFn: (booksToSend) => {
      const sentDate = new Date().toISOString().split('T')[0];
      const promises = booksToSend.map(book =>
        updateResultsSentDateService(book.student.id, { resultsSentDate: sentDate })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast.success("Selected results sent to school successfully.");
      setRowSelection({});
      queryClient.invalidateQueries(['books']);
    },
    onError: (error) => toast.error(`Error sending to school: ${error.message}`)
  });

  const senateApproveMultipleMutation = useMutation({
    mutationFn: (booksToApprove) => {
      const promises = booksToApprove.map(book =>
        updateSenateApprovalDateService(book.student.id, senateApprovalDate)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast.success("Selected results marked as senate approved.");
      setRowSelection({});
      setIsSenateApproveDialogOpen(false);
      setSelectedSenateData(null);
      queryClient.invalidateQueries(['books']);
    },
    onError: (error) => toast.error(`Error during senate approval: ${error.message}`)
  });

  const sendResultsEmailMutation = useMutation({
    mutationFn: sendResultsEmailService,
    onSuccess: (data, variables) => {
      toast.success(`Results sent to ${variables.schoolName} successfully.`);
      setIsSendToSchoolDialogOpen(false);
      setSelectedSchoolData(null);
      queryClient.invalidateQueries(['books']);
    },
    onError: (error) => {
      console.error('Email sending failed:', error);
      toast.error(`Error sending results: ${error.message || 'Failed to send email'}`);
    }
  });

  const handleDateUpdate = (e) => {
    e.preventDefault();
    const payload = { [getDateField(selectedBook).key]: selectedDate };
    switch (activeTab) {
      case "results-approved-at-centre":
        updateResultsSentMutation.mutate(payload);
        break;
      case "results-sent":
        updateSenateApprovalMutation.mutate(payload);
        break;
      default:
        break;
    }
  };

  const handleBulkApprove = () => {
    const selectedBooks = Object.keys(rowSelection).map(index => pendingApprovalData[parseInt(index, 10)]);
    if (selectedBooks.length > 0) {
      setIsApproveDialogOpen(true);
    } else {
      toast.info("No items selected for approval.");
    }
  };

  const confirmBulkApprove = () => {
    const selectedBooks = Object.keys(rowSelection).map(index => pendingApprovalData[parseInt(index, 10)]);

    approveMultipleMutation.mutate({ booksToApprove: selectedBooks, approvalDate });
  };

  const handleBulkSendToSchool = () => {
    const selectedBooks = Object.keys(rowSelection).map(index => approvedAtCentreData[parseInt(index, 10)]);
    if (selectedBooks.length > 0) sendToSchoolMultipleMutation.mutate(selectedBooks);
    else toast.info("No items selected to send.");
  };

  const handleBulkSenateApprove = () => {
    const selectedBooks = Object.keys(rowSelection).map(index => resultsSentData[parseInt(index, 10)]);
    if (selectedBooks.length > 0) senateApproveMultipleMutation.mutate(selectedBooks);
    else toast.info("No items selected for senate approval.");
  };

  const handleSenateApproveSchool = (schoolData) => {
    if (schoolData.length > 0) {
      setSelectedSenateData(schoolData);
      setIsSenateApproveDialogOpen(true);
    } else {
      toast.info("No data available for senate approval.");
    }
  };

  const confirmSenateApprove = () => {
    if (selectedSenateData && selectedSenateData.length > 0) {
      senateApproveMultipleMutation.mutate(selectedSenateData);
    } else {
      toast.info("No data available for senate approval.");
    }
  };

  const getDateField = (book) => {
    switch (activeTab) {
      case "results-approved-at-centre":
        return { key: 'resultsSentDate', value: book.student?.resultsSentDate };
      case "results-sent":
        return { key: 'senateApprovalDate', value: book.student?.senateApprovalDate };
      default:
        return { key: '', value: null };
    }
  };

  const getDialogTitle = () => {
    switch (activeTab) {
      case "results-approved-at-centre":
        return "Update Results Sent Date";
      case "results-sent":
        return "Update Senate Approval Date";
      default:
        return "Update Date";
    }
  };

  const calculateFinalMarks = (examinerAssignment) => {
    if (!examinerAssignment) return { total: 0 };
    let marks = { externalMark: 0, internalMark: 0 };
    const currentAssignments = examinerAssignment?.filter(assignment => assignment.isCurrent);
    currentAssignments?.forEach(assignment => {
      if (assignment.examiner?.type === 'External') marks.externalMark = assignment.grade || 0;
      else if (assignment.examiner?.type === 'Internal') marks.internalMark = assignment.grade || 0;
    });
    const externalFinal = (marks.externalMark || 0) * 0.6;
    const internalFinal = (marks.internalMark || 0) * 0.4;
    return {
      externalMark: marks.externalMark,
      internalMark: marks.internalMark,
      external: externalFinal,
      internal: internalFinal,
      total: externalFinal + internalFinal
    };
  };

  // Use the same reportsColumns for all tabs, but add checkbox for first three tabs
  const getColumnsForTab = (tab) => {
    const checkboxColumn = {
      id: 'select',
      header: ({ table }) => <IndeterminateCheckbox {...{ checked: table.getIsAllRowsSelected(), indeterminate: table.getIsSomeRowsSelected(), onChange: table.getToggleAllRowsSelectedHandler() }} />,
      cell: ({ row }) => <IndeterminateCheckbox {...{ checked: row.getIsSelected(), disabled: !row.getCanSelect(), indeterminate: row.getIsSomeSelected(), onChange: row.getToggleSelectedHandler() }} />,
      size: 40,
    };
    if (["results-pending-approval", "results-approved-at-centre", "results-sent"].includes(tab)) {
      return [checkboxColumn, ...reportsColumns];
    }
    return reportsColumns;
  };

  const tableInstances = {
    "results-pending-approval": useReactTable({
      data: pendingApprovalData,
      columns: getColumnsForTab("results-pending-approval"),
      state: { rowSelection },
      onRowSelectionChange: setRowSelection,
      enableRowSelection: true,
      getCoreRowModel: getCoreRowModel(),
    }),
    "results-approved-at-centre": useReactTable({
      data: approvedAtCentreData,
      columns: getColumnsForTab("results-approved-at-centre"),
      state: { rowSelection },
      onRowSelectionChange: setRowSelection,
      enableRowSelection: true,
      getCoreRowModel: getCoreRowModel(),
    }),
    "results-sent": useReactTable({
      data: resultsSentData,
      columns: getColumnsForTab("results-sent"),
      state: { rowSelection },
      onRowSelectionChange: setRowSelection,
      enableRowSelection: true,
      getCoreRowModel: getCoreRowModel(),
    }),
    "senate-approval": useReactTable({
      data: senateApprovalData,
      columns: getColumnsForTab("senate-approval"),
      getCoreRowModel: getCoreRowModel(),
    }),
    "reports": useReactTable({
      data: filteredData,
      columns: getColumnsForTab("reports"),
      getCoreRowModel: getCoreRowModel(),
    }),
  };

  const currentTable = tableInstances[activeTab];

  const handleExportAll = () => {
    // Excel export logic
    const headers = [
      "No", "NAME", "REG. NO", "GENDER", "COURSE", "YEAR OF ENROLLMENT", "CAMPUS",
      "L.E. text (100%)", "L.E. text (20%)", "E.E. text (100%)", "E.E. text (40%)", "Total text mark (out of 60)",
      "L.E. viva (100%)", "L.E. viva (20%)", "E.E. viva (100%)", "E.E. viva (20%)", "Total viva mark (out of 40)",
      "Final Dissertation mark (out of 100)", "Status"
    ];

    let ws_data = [];
    // Title and academic year
    ws_data.push(["UGANDA MANAGEMENT INSTITUTE"]);
    ws_data.push([`PROVISIONAL DISSERTATION EXAMINATION RESULTS FOR THE ACADEMIC YEAR ${currentAcademicYear || '_____/_____'}`]);
    ws_data.push([]);

    // Track row indices for formatting
    let rowIndex = 0;
    const formatInstructions = [];

    // Grouped by course and school
    Object.entries(groupedByCourseAndSchool).forEach(([course, schools]) => {
      ws_data.push([`Course: ${course}`]);
      formatInstructions.push({ type: 'course', row: rowIndex });
      rowIndex++;
      Object.entries(schools).forEach(([school, items]) => {
        ws_data.push([`School: ${school}`]);
        formatInstructions.push({ type: 'school', row: rowIndex });
        rowIndex++;
        ws_data.push(headers);
        formatInstructions.push({ type: 'header', row: rowIndex });
        rowIndex++;
        items.forEach((book, index) => {
          const { textMarks, vivaMarks } = getStudentMarks(book);
          const regNo = book.student?.registrationNumber || "";
          const textTotal = (textMarks.internal * 0.2) + (textMarks.external * 0.4);
          const vivaTotal = (vivaMarks.internal * 0.2) + (vivaMarks.external * 0.2);
          const finalMark = textTotal + vivaTotal;
          ws_data.push([
            index + 1,
            book.student?.fullName || "N/A",
            regNo, book.student?.gender === "male" ? "M" : "F" || "N/A",
            book.student?.course?.code || book.student?.course?.title || regNo.split('/')[2] || "N/A",
            book.student?.academicYear || `20${regNo.split('/')[0]}` || "N/A",
            book.student?.campus?.location || regNo.split('/')[3] || "N/A",
            textMarks.internal.toFixed(0),
            (textMarks.internal * 0.2).toFixed(0),
            textMarks.external.toFixed(0),
            (textMarks.external * 0.4).toFixed(0),
            textTotal.toFixed(0),
            vivaMarks.internal.toFixed(0),
            (vivaMarks.internal * 0.2).toFixed(0),
            vivaMarks.external.toFixed(0),
            (vivaMarks.external * 0.2).toFixed(0),
            vivaTotal.toFixed(0),
            finalMark.toFixed(0),
            book.vivaHistory?.find(v => v.isCurrent)?.status || 'Complete'
          ]);
          formatInstructions.push({ type: 'row', row: rowIndex });
          rowIndex++;
        });
        ws_data.push([]);
        rowIndex++;
      });
      ws_data.push([]);
      rowIndex++;
    });

    // Add formatting for title and academic year
    formatInstructions.unshift({ type: 'title', row: 0 });
    formatInstructions.unshift({ type: 'subtitle', row: 1 });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Set column widths for readability
    ws['!cols'] = [
      { wch: 5 },   // No
      { wch: 22 },  // Name
      { wch: 14 },  // Reg No
      { wch: 8 },   // Gender
      { wch: 18 },  // Course
      { wch: 18 },  // Year
      { wch: 12 },  // Campus
      { wch: 12 },  // L.E. text (100%)
      { wch: 12 },  // L.E. text (20%)
      { wch: 12 },  // E.E. text (100%)
      { wch: 12 },  // E.E. text (40%)
      { wch: 18 },  // Total text mark
      { wch: 12 },  // L.E. viva (100%)
      { wch: 12 },  // L.E. viva (20%)
      { wch: 12 },  // E.E. viva (100%)
      { wch: 12 },  // E.E. viva (20%)
      { wch: 18 },  // Total viva mark
      { wch: 22 },  // Final Dissertation mark
      { wch: 14 },  // Status
    ];

    // Apply cell styles
    formatInstructions.forEach(({ type, row }) => {
      if (!ws_data[row]) return;
      const isHeader = type === 'header';
      const isTitle = type === 'title';
      const isSubtitle = type === 'subtitle';
      const isCourse = type === 'course';
      const isSchool = type === 'school';
      const isRow = type === 'row';
      for (let c = 0; c < ws_data[row].length; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c });
        if (!ws[cellRef]) continue;
        // Title
        if (isTitle) {
          ws[cellRef].s = {
            font: { bold: true, sz: 16 },
            alignment: { horizontal: 'center', vertical: 'center' },
          };
        } else if (isSubtitle) {
          ws[cellRef].s = {
            font: { bold: true, sz: 13 },
            alignment: { horizontal: 'center', vertical: 'center' },
          };
        } else if (isHeader) {
          ws[cellRef].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: 'D9E1F2' } },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } },
            },
            alignment: { horizontal: 'center', vertical: 'center' },
          };
        } else if (isCourse || isSchool) {
          ws[cellRef].s = {
            font: { bold: true, sz: 12 },
            alignment: { horizontal: 'left', vertical: 'center' },
          };
        } else if (isRow) {
          ws[cellRef].s = {
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } },
            },
            alignment: { horizontal: 'center', vertical: 'center' },
          };
        }
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `grade_report_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const handleExportSelected = () => {
    const selectedIndices = Object.keys(rowSelection);
    if (selectedIndices.length === 0) {
      toast.info("No items selected for export.");
      return;
    }

    let dataToExport;
    switch (activeTab) {
      case 'results-pending-approval':
        dataToExport = selectedIndices.map(index => pendingApprovalData[parseInt(index, 10)]);
        break;
      case 'results-approved-at-centre':
        dataToExport = selectedIndices.map(index => approvedAtCentreData[parseInt(index, 10)]);
        break;
      case 'results-sent':
        dataToExport = selectedIndices.map(index => resultsSentData[parseInt(index, 10)]);
        break;
      default:
        dataToExport = [];
    }
    generateReportCSV(dataToExport);
  };

  const TableComponent = ({ table }) => (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  colSpan={header.colSpan}
                  className="px-2 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-600 border border-gray-200"
                  style={{ width: header.getSize() }}
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
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className="px-2 py-2 text-xs border border-gray-200 text-center"
                    style={{ width: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={table.getAllColumns().length} className="text-center py-8 text-gray-500">
                No data available for this tab.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // Export all to Excel for any tab
  const handleExportAllTab = () => {
    let exportData = [];
    let columns = [];
    let sheetTitle = "";
    let isGrouped = false;
    switch (activeTab) {
      case "results-pending-approval":
        exportData = pendingApprovalData;
        columns = getColumnsForTab("results-pending-approval").filter(col => col.id !== 'select');
        sheetTitle = "Results Pending Approval";
        break;
      case "results-approved-at-centre":
        exportData = approvedAtCentreData;
        columns = getColumnsForTab("results-approved-at-centre").filter(col => col.id !== 'select');
        sheetTitle = "Results Approved at Centre";
        break;
      case "results-sent":
        exportData = resultsSentData;
        columns = getColumnsForTab("results-sent").filter(col => col.id !== 'select');
        sheetTitle = "Results Sent to School";
        break;
      case "senate-approval":
        exportData = senateApprovalData;
        columns = getColumnsForTab("senate-approval");
        sheetTitle = "Results Approved by Senate";
        break;
      case "reports":
      default:
        // Use grouped export for reports tab
        handleExportAll();
        return;
    }
    // Build headers from columns
    const headers = columns.map(col => typeof col.header === 'string' ? col.header : (typeof col.header === 'function' ? col.header({}) : ''));
    let ws_data = [];
    ws_data.push(["UGANDA MANAGEMENT INSTITUTE"]);
    ws_data.push([`PROVISIONAL DISSERTATION EXAMINATION RESULTS FOR THE ACADEMIC YEAR ${currentAcademicYear || '_____/_____'} - ${sheetTitle}`]);
    ws_data.push([]);
    ws_data.push(headers);
    exportData.forEach((row, idx) => {
      const rowData = columns.map((col, colIdx) => {
        // If accessor is a function, call it; if string, get property
        if (typeof col.accessorFn === 'function') {
          return col.accessorFn(row, idx);
        } else if (typeof col.accessorKey === 'string') {
          // Support for string accessorKey
          return row[col.accessorKey];
        } else {
          return '';
        }
      });
      ws_data.push(rowData);
    });
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    // Set column widths for readability (reuse from reports tab)
    ws['!cols'] = [
      { wch: 5 },   // No
      { wch: 22 },  // Name
      { wch: 14 },  // Reg No
      { wch: 8 },   // Gender
      { wch: 18 },  // Course
      { wch: 18 },  // Year
      { wch: 12 },  // Campus
      { wch: 12 },  // L.E. text (100%)
      { wch: 12 },  // L.E. text (20%)
      { wch: 12 },  // E.E. text (100%)
      { wch: 12 },  // E.E. text (40%)
      { wch: 18 },  // Total text mark
      { wch: 12 },  // L.E. viva (100%)
      { wch: 12 },  // L.E. viva (20%)
      { wch: 12 },  // E.E. viva (100%)
      { wch: 12 },  // E.E. viva (20%)
      { wch: 18 },  // Total viva mark
      { wch: 22 },  // Final Dissertation mark
      { wch: 14 },  // Status
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `grade_report_${activeTab}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  // Group approved results by school
  const groupedBySchool = useMemo(() => {
    const groups = {};
    approvedAtCentreData.forEach(book => {
      const schoolName = book.student?.school?.name || 'Unknown School';
      if (!groups[schoolName]) {
        groups[schoolName] = [];
      }
      groups[schoolName].push(book);
    });
    return groups;
  }, [approvedAtCentreData]);

  // Group results sent to school by school
  const groupedBySchoolForSentData = useMemo(() => {
    const groups = {};
    resultsSentData.forEach(book => {
      const schoolName = book.student?.school?.name || 'Unknown School';
      if (!groups[schoolName]) {
        groups[schoolName] = [];
      }
      groups[schoolName].push(book);
    });
    return groups;
  }, [resultsSentData]);

  const handleSendToSchool = (schoolName, schoolData) => {
    setSelectedSchoolData({ schoolName, data: schoolData });
    setEmailRecipients("");
    setEmailMessage("");
    setEmailSubject(`Results for ${schoolName} - ${currentAcademicYear}`);
    setIsSendToSchoolDialogOpen(true);
  };

  const confirmSendToSchool = async () => {
    if (!emailRecipients.trim()) {
      toast.error("Please enter email recipients");
      return;
    }

    // Generate Excel file for the school
    const schoolName = selectedSchoolData.schoolName;
    const schoolData = selectedSchoolData.data;

    // Create Excel workbook
    const wb = XLSX.utils.book_new();

    // Prepare data for Excel
    const headers = [
      "No", "NAME", "REG. NO", "GENDER", "COURSE", "YEAR OF ENROLLMENT", "CAMPUS",
      "L.E. text (100%)", "L.E. text (20%)", "E.E. text (100%)", "E.E. text (40%)", "Total text mark (out of 60)",
      "L.E. viva (100%)", "L.E. viva (20%)", "E.E. viva (100%)", "E.E. viva (20%)", "Total viva mark (out of 40)",
      "Final Dissertation mark (out of 100)", "Status"
    ];

    const ws_data = [
      ["UGANDA MANAGEMENT INSTITUTE"],
      [`PROVISIONAL DISSERTATION EXAMINATION RESULTS FOR ${schoolName} - ACADEMIC YEAR ${currentAcademicYear || '_____/_____'}`],
      [],
      headers
    ];

    schoolData.forEach((book, index) => {
      const { textMarks, vivaMarks } = getStudentMarks(book);
      const regNo = book.student?.registrationNumber || "";
      const textTotal = (textMarks.internal * 0.2) + (textMarks.external * 0.4);
      const vivaTotal = (vivaMarks.internal * 0.2) + (vivaMarks.external * 0.2);
      const finalMark = textTotal + vivaTotal;

      ws_data.push([
        index + 1,
        book.student?.fullName || "N/A",
        regNo,
        book.student?.gender === "male" ? "M" : "F" || "N/A",
        book.student?.course?.code || book.student?.course?.title || regNo.split('/')[2] || "N/A",
        book.student?.academicYear || `20${regNo.split('/')[0]}` || "N/A",
        book.student?.campus?.location || regNo.split('/')[3] || "N/A",
        textMarks.internal.toFixed(0),
        (textMarks.internal * 0.2).toFixed(0),
        textMarks.external.toFixed(0),
        (textMarks.external * 0.4).toFixed(0),
        textTotal.toFixed(0),
        vivaMarks.internal.toFixed(0),
        (vivaMarks.internal * 0.2).toFixed(0),
        vivaMarks.external.toFixed(0),
        (vivaMarks.external * 0.2).toFixed(0),
        vivaTotal.toFixed(0),
        finalMark.toFixed(0),
        book.vivaHistory?.find(v => v.isCurrent)?.status || 'Complete'
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Apply formatting
    ws['!cols'] = [
      { wch: 5 }, { wch: 22 }, { wch: 14 }, { wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 },
      { wch: 22 }, { wch: 14 }
    ];

    // Apply styles
    for (let r = 0; r < ws_data.length; r++) {
      for (let c = 0; c < ws_data[r].length; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (ws[cellRef]) {
          if (r === 0) {
            ws[cellRef].s = { font: { bold: true, sz: 16 }, alignment: { horizontal: 'center' } };
          } else if (r === 1) {
            ws[cellRef].s = { font: { bold: true, sz: 13 }, alignment: { horizontal: 'center' } };
          } else if (r === 3) {
            ws[cellRef].s = {
              font: { bold: true },
              fill: { fgColor: { rgb: 'D9E1F2' } },
              border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
              alignment: { horizontal: 'center' }
            };
          } else if (r > 3) {
            ws[cellRef].s = {
              border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
              alignment: { horizontal: 'center' }
            };
          }
        }
      }
    }

    const sheetName = schoolName.length > 31 ? schoolName.substring(0, 31) : schoolName;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Generate Excel file as base64 string
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    const fileName = `${schoolName}_Results_${currentAcademicYear}.xlsx`;

    // Get student IDs for updating results sent date
    const studentIds = schoolData.map(book => book.student.id);

    // Send email using the mutation
    sendResultsEmailMutation.mutate({
      to: emailRecipients,
      subject: emailSubject,
      message: emailMessage,
      schoolName,
      academicYear: currentAcademicYear,
      studentCount: schoolData.length,
      excelBuffer,
      fileName,
      studentIds
    });
  };

  const handleExportSchoolData = (schoolName, schoolData) => {
    // Create Excel workbook
    const wb = XLSX.utils.book_new();

    // Prepare data for Excel
    const headers = [
      "No", "NAME", "REG. NO", "GENDER", "COURSE", "YEAR OF ENROLLMENT", "CAMPUS",
      "L.E. text (100%)", "L.E. text (20%)", "E.E. text (100%)", "E.E. text (40%)", "Total text mark (out of 60)",
      "L.E. viva (100%)", "L.E. viva (20%)", "E.E. viva (100%)", "E.E. viva (20%)", "Total viva mark (out of 40)",
      "Final Dissertation mark (out of 100)", "Status"
    ];

    const ws_data = [
      ["UGANDA MANAGEMENT INSTITUTE"],
      [`PROVISIONAL DISSERTATION EXAMINATION RESULTS FOR ${schoolName} - ACADEMIC YEAR ${currentAcademicYear || '_____/_____'}`],
      [],
      headers
    ];

    schoolData.forEach((book, index) => {
      const { textMarks, vivaMarks } = getStudentMarks(book);
      const regNo = book.student?.registrationNumber || "";
      const textTotal = (textMarks.internal * 0.2) + (textMarks.external * 0.4);
      const vivaTotal = (vivaMarks.internal * 0.2) + (vivaMarks.external * 0.2);
      const finalMark = textTotal + vivaTotal;

      ws_data.push([
        index + 1,
        book.student?.fullName || "N/A",
        regNo,
        book.student?.gender === "male" ? "M" : "F" || "N/A",
        book.student?.course?.code || book.student?.course?.title || regNo.split('/')[2] || "N/A",
        book.student?.academicYear || `20${regNo.split('/')[0]}` || "N/A",
        book.student?.campus?.location || regNo.split('/')[3] || "N/A",
        textMarks.internal.toFixed(0),
        (textMarks.internal * 0.2).toFixed(0),
        textMarks.external.toFixed(0),
        (textMarks.external * 0.4).toFixed(0),
        textTotal.toFixed(0),
        vivaMarks.internal.toFixed(0),
        (vivaMarks.internal * 0.2).toFixed(0),
        vivaMarks.external.toFixed(0),
        (vivaMarks.external * 0.2).toFixed(0),
        vivaTotal.toFixed(0),
        finalMark.toFixed(0),
        book.vivaHistory?.find(v => v.isCurrent)?.status || 'Complete'
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Apply formatting
    ws['!cols'] = [
      { wch: 5 }, { wch: 22 }, { wch: 14 }, { wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 },
      { wch: 22 }, { wch: 14 }
    ];

    // Apply styles
    for (let r = 0; r < ws_data.length; r++) {
      for (let c = 0; c < ws_data[r].length; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (ws[cellRef]) {
          if (r === 0) {
            ws[cellRef].s = { font: { bold: true, sz: 16 }, alignment: { horizontal: 'center' } };
          } else if (r === 1) {
            ws[cellRef].s = { font: { bold: true, sz: 13 }, alignment: { horizontal: 'center' } };
          } else if (r === 3) {
            ws[cellRef].s = {
              font: { bold: true },
              fill: { fgColor: { rgb: 'D9E1F2' } },
              border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
              alignment: { horizontal: 'center' }
            };
          } else if (r > 3) {
            ws[cellRef].s = {
              border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
              alignment: { horizontal: 'center' }
            };
          }
        }
      }
    }

    const sheetName = schoolName.length > 31 ? schoolName.substring(0, 31) : schoolName;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${schoolName}_Results_${currentAcademicYear}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-gray-200 pb-4">
        <nav className="flex -mb-px gap-4 justify-end">
          <button
            onClick={() => setActiveTab("results-pending-approval")}
            className={`py-2 px-4 text-xs font-medium rounded-lg ${activeTab === "results-pending-approval" ? "bg-primary-50 text-primary-600 border-2 border-primary-600" : "text-gray-500 hover:text-gray-700 hover:border-gray-300 border-2 border-gray-200"}`}
          >
            Results Pending Approval
          </button>
          <button
            onClick={() => setActiveTab("results-approved-at-centre")}
            className={`py-2 px-4 text-xs font-medium rounded-lg ${activeTab === "results-approved-at-centre" ? "bg-primary-50 text-primary-600 border-2 border-primary-600" : "text-gray-500 hover:text-gray-700 hover:border-gray-300 border-2 border-gray-200"}`}
          >
            Results Approved at Centre
          </button>
          <button
            onClick={() => setActiveTab("results-sent")}
            className={`py-2 px-4 text-xs font-medium rounded-lg ${activeTab === "results-sent" ? "bg-primary-50 text-primary-600 border-2 border-primary-600" : "text-gray-500 hover:text-gray-700 hover:border-gray-300 border-2 border-gray-200"}`}
          >
            Results Sent to School
          </button>
          <button
            onClick={() => setActiveTab("senate-approval")}
            className={`py-2 px-4 text-xs font-medium rounded-lg ${activeTab === "senate-approval" ? "bg-primary-50 text-primary-600 border-2 border-primary-600" : "text-gray-500 hover:text-gray-700 hover:border-gray-300 border-2 border-gray-200"}`}
          >
            Results Approved by Senate
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`py-2 px-4 text-xs font-medium rounded-lg ${activeTab === "reports" ? "bg-primary-50 text-primary-600 border-2 border-primary-600" : "text-gray-500 hover:text-gray-700 hover:border-gray-300 border-2 border-gray-200"}`}
          >
            Reports
          </button>
        </nav>
      </div>

      <div>
        {activeTab === 'reports' ? (
          <div className="space-y-4">
            <div className="text-center">
              <h1 className="font-bold text-lg">UGANDA MANAGEMENT INSTITUTE</h1>
              <h2 className="font-semibold">
                PROVISIONAL DISSERTATION EXAMINATION RESULTS FOR THE ACADEMIC YEAR {currentAcademicYear || '_____/_____'}
              </h2>
            </div>
            <div className="flex justify-end mb-4">
              <Button onClick={handleExportAllTab} className="flex items-center gap-2" disabled={filteredData.length === 0}>
                <Download className="h-4 w-4" />
                Export All to Excel
              </Button>
            </div>
            {/* Grouped tables by Course and School (using child component) */}
            {Object.entries(groupedByCourseAndSchool).map(([course, schools]) => (
              <div key={course} className="mb-8">
                <h3 className="text-lg font-bold mb-2">Course: {course}</h3>
                {Object.entries(schools).map(([school, items]) => (
                  <div key={school} className="mb-6">
                    <h4 className="text-base font-semibold mb-1">School: {school}</h4>
                    <GroupedReportTable items={items} reportsColumns={reportsColumns} TableComponent={TableComponent} />
                  </div>
                ))}
              </div>
            ))}
            <div className="text-sm mt-4">
              <p><strong>From August 2014 - Marking Dissertations:</strong> Moderation = 20% and External Examinations = 40%</p>
              <p><strong>From August 2014 - VIVA VOCES:</strong> Moderation = 20% and External Examinations = 20%</p>
            </div>
          </div>
        ) : activeTab === 'results-pending-approval' ? (
          <>
            <div className="flex justify-end mb-4">
              <Button onClick={handleExportAllTab} className="flex items-center gap-2" disabled={pendingApprovalData.length === 0}>
                <Download className="h-4 w-4" />
                Export All to Excel
              </Button>
            </div>
            <TableComponent table={currentTable} />
            <div className="flex justify-end mt-4 space-x-2">
              {['results-pending-approval', 'results-approved-at-centre', 'results-sent'].includes(activeTab) && (
                <Button
                  onClick={handleExportSelected}
                  disabled={Object.keys(rowSelection).length === 0}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export Selected ({Object.keys(rowSelection).length})
                </Button>
              )}
              {activeTab === 'results-pending-approval' && (
                <Button onClick={handleBulkApprove} disabled={Object.keys(rowSelection).length === 0 || approveMultipleMutation.isPending}>
                  {approveMultipleMutation.isPending ? "Approving..." : "Approve Selected"}
                </Button>
              )}
            </div>
          </>
        ) : activeTab === 'results-approved-at-centre' ? (
          <>
            <div className="space-y-6">
              {Object.entries(groupedBySchool).map(([schoolName, schoolData]) => {
                return (
                  <SchoolTable
                    key={schoolName}
                    schoolName={schoolName}
                    schoolData={schoolData}
                    onExport={handleExportSchoolData}
                    onSendToSchool={handleSendToSchool}
                    onSenateApprove={handleSenateApproveSchool}
                    currentAcademicYear={currentAcademicYear}
                    getColumnsForTab={getColumnsForTab}
                    isEmailLoading={sendResultsEmailMutation.isPending}
                    isSenateLoading={senateApproveMultipleMutation.isPending}
                    tab="results-approved-at-centre"
                  />
                );
              })}

              {Object.keys(groupedBySchool).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No data available for Results Approved at Centre.
                </div>
              )}
            </div>
          </>
        ) : activeTab === 'results-sent' ? (
          <>
            <div className="space-y-6">
              {Object.entries(groupedBySchoolForSentData).map(([schoolName, schoolData]) => {
                return (
                  <SchoolTable
                    key={schoolName}
                    schoolName={schoolName}
                    schoolData={schoolData}
                    onExport={handleExportSchoolData}
                    onSendToSchool={handleSendToSchool}
                    onSenateApprove={handleSenateApproveSchool}
                    currentAcademicYear={currentAcademicYear}
                    getColumnsForTab={getColumnsForTab}
                    isEmailLoading={sendResultsEmailMutation.isPending}
                    isSenateLoading={senateApproveMultipleMutation.isPending}
                    tab="results-sent"
                  />
                );
              })}

              {Object.keys(groupedBySchoolForSentData).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No data available for Results Sent to School.
                </div>
              )}
            </div>
          </>
        ) : activeTab === 'senate-approval' ? (
          <>
            <div className="flex justify-end mb-4">
              <Button onClick={handleExportAllTab} className="flex items-center gap-2" disabled={senateApprovalData.length === 0}>
                <Download className="h-4 w-4" />
                Export All to Excel
              </Button>
            </div>
            <TableComponent table={currentTable} />
          </>
        ) : null}
      </div>

      <Dialog open={isDateDialogOpen} onOpenChange={setIsDateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDateUpdate} className="grid gap-6 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium leading-none">
                Date
              </label>
              <input
                type="date"
                value={selectedDate || ''}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!selectedDate ||
                  updateResultsApprovalMutation.isPending ||
                  updateResultsSentMutation.isPending ||
                  updateSenateApprovalMutation.isPending}
              >
                {updateResultsApprovalMutation.isPending ||
                  updateResultsSentMutation.isPending ||
                  updateSenateApprovalMutation.isPending
                  ? "Updating..."
                  : "Update"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approval Confirmation Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Results Approval</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="text-sm text-gray-600">
              Are you sure you want to approve the selected results? This action will move the selected items to the "Results Approved at Centre" tab.
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium leading-none">
                Approval Date
              </label>
              <input
                type="date"
                value={approvalDate}
                onChange={(e) => setApprovalDate(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
            </div>
            <div className="text-sm text-gray-500">
              Selected items: {Object.keys(rowSelection).length}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsApproveDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmBulkApprove}
                disabled={!approvalDate || approveMultipleMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {approveMultipleMutation.isPending ? "Approving..." : "Confirm Approval"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send to School Dialog */}
      <Dialog open={isSendToSchoolDialogOpen} onOpenChange={setIsSendToSchoolDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Send Results to School</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="text-sm text-gray-600">
              Sending results for <strong>{selectedSchoolData?.schoolName}</strong> ({selectedSchoolData?.data?.length} students)
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium leading-none">
                Email Recipients
              </label>
              <input
                type="email"
                multiple
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
                placeholder="Enter email addresses separated by commas"
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium leading-none">
                Subject
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium leading-none">
                Message
              </label>
              <textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Enter your message here..."
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="text-sm text-gray-500">
              <strong>Attachment:</strong> {selectedSchoolData?.schoolName}_Results_{currentAcademicYear}.xlsx
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSendToSchoolDialogOpen(false)}
                disabled={sendResultsEmailMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmSendToSchool}
                disabled={!emailRecipients.trim() || sendResultsEmailMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {sendResultsEmailMutation.isPending ? "Sending..." : "Send Email & Update Status"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Senate Approval Confirmation Dialog */}
      <Dialog open={isSenateApproveDialogOpen} onOpenChange={setIsSenateApproveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Senate Approval</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="text-sm text-gray-600">
              Are you sure you want to mark the selected results as senate approved? This action will move the selected items to the "Senate Approval" tab.
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium leading-none">
                Senate Approval Date
              </label>
              <input
                type="date"
                value={senateApprovalDate}
                onChange={(e) => setSenateApprovalDate(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
            </div>
            <div className="text-sm text-gray-500">
              Selected items: {selectedSenateData?.length || 0}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSenateApproveDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmSenateApprove}
                disabled={!senateApprovalDate || senateApproveMultipleMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {senateApproveMultipleMutation.isPending ? "Approving..." : "Confirm Senate Approval"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GradeManagementFinalSubmissionTable;