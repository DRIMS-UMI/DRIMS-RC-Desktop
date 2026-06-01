import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, Video, Plus, Edit, Trash2, Eye, BarChart3, Filter, Download, Printer, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGetAllResearchClinicDays, useGetResearchClinicBookings, useGetResearchClinicStatistics, useCreateResearchClinicDay, useUpdateResearchClinicDay, useUpdateBookingStatus, useDeleteResearchClinicDay } from '../../store/tanstackStore/services/queries';
import { useQueryClient } from '@tanstack/react-query';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Document, Packer, Paragraph, TextRun, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle } from 'docx';

const ResearchClinicManagement = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('clinic-days');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [formData, setFormData] = useState({
    startTime: '',
    endTime: '',
    maxBookings: 10,
    zoomLink: '',
    description: '',
    selectedDaysOfWeek: [],
    weekStartDate: new Date().toISOString().split('T')[0], // Default to today
    numberOfWeeks: 1
  });

  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarStartDate, setCalendarStartDate] = useState(new Date().toISOString().split('T')[0]); // Default to today

  // Statistics state
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [showStatisticsDialog, setShowStatisticsDialog] = useState(false);

  const queryClient = useQueryClient();

  // TanStack Query hooks
  const { data: clinicDaysData, isLoading: clinicDaysLoading } = useGetAllResearchClinicDays();
  const { data: bookingsData, isLoading: bookingsLoading } = useGetResearchClinicBookings();
  const { data: statisticsData, isLoading: statisticsLoading } = useGetResearchClinicStatistics();

  // Mutations
  const createClinicDayMutation = useCreateResearchClinicDay();
  const updateClinicDayMutation = useUpdateResearchClinicDay();
  const updateBookingStatusMutation = useUpdateBookingStatus();
  const deleteClinicDayMutation = useDeleteResearchClinicDay();

  // Extract isPending states for loading indicators
  const isCreating = createClinicDayMutation.isPending;
  const isUpdating = updateClinicDayMutation.isPending;
  const isUpdatingBooking = updateBookingStatusMutation.isPending;
  const isDeleting = deleteClinicDayMutation.isPending;

  const clinicDays = clinicDaysData?.clinicDays || [];
  const bookings = bookingsData?.bookings || [];
  const statistics = statisticsData?.statistics || {};

  const handleCreateClinicDay = async () => {
    try {
      await createClinicDayMutation.mutateAsync(formData);
      toast.success('Weekly clinic schedule created successfully');
      setShowCreateDialog(false);
      setFormData({
        startTime: '',
        endTime: '',
        maxBookings: 10,
        zoomLink: '',
        description: '',
        selectedDaysOfWeek: [],
        weekStartDate: new Date().toISOString().split('T')[0],
        numberOfWeeks: 1
      });

      // Refresh the data to show new sessions
      queryClient.invalidateQueries({ queryKey: ['researchClinicDays'] });
    } catch (error) {
      toast.error('Failed to create weekly clinic schedule');
      console.error('Error creating clinic day:', error);
    }
  };

  const handleUpdateClinicDay = async () => {
    try {
      await updateClinicDayMutation.mutateAsync({
        id: selectedDay.id,
        data: formData
      });

      toast.success('Weekly clinic schedule updated successfully');
      setShowEditDialog(false);
      setSelectedDay(null);
      setFormData({
        startTime: '',
        endTime: '',
        maxBookings: 10,
        zoomLink: '',
        description: '',
        selectedDaysOfWeek: [],
        weekStartDate: new Date().toISOString().split('T')[0],
        numberOfWeeks: 1
      });

      // Refresh the data to show updated sessions
      queryClient.invalidateQueries({ queryKey: ['researchClinicDays'] });
    } catch (error) {
      toast.error('Failed to update weekly clinic schedule');
      console.error('Error updating clinic day:', error);
    }
  };

  const handleUpdateBookingStatus = async (bookingId, status, notes = '', feedback = '') => {
    try {
      await updateBookingStatusMutation.mutateAsync({
        bookingId,
        data: {
          status,
          notes,
          feedback
        }
      });
      toast.success('Booking status updated successfully');
    } catch (error) {
      toast.error('Failed to update booking status');
      console.error('Error updating booking status:', error);
    }
  };

  const handleDeleteClinicDay = async (clinicDayId) => {
    if (!confirm('Are you sure you want to delete this clinic day and all its generated sessions? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteClinicDayMutation.mutateAsync(clinicDayId);
      toast.success('Clinic day deleted successfully');
    } catch (error) {
      toast.error('Failed to delete clinic day');
      console.error('Error deleting clinic day:', error);
    }
  };

  const openEditDialog = (day) => {
    setSelectedDay(day);
    setFormData({
      startTime: day.startTime,
      endTime: day.endTime,
      maxBookings: day.maxBookings,
      zoomLink: day.zoomLink || '',
      description: day.description || '',
      selectedDaysOfWeek: day.selectedDaysOfWeek || [],
      weekStartDate: day.weekStartDate ? day.weekStartDate.split('T')[0] : new Date().toISOString().split('T')[0],
      numberOfWeeks: day.numberOfWeeks || 1
    });
    setShowEditDialog(true);
  };

  const openBookingDialog = (booking) => {
    setSelectedBooking(booking);
    setShowBookingDialog(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      ACTIVE: { variant: 'default', text: 'Active' },
      INACTIVE: { variant: 'secondary', text: 'Inactive' },
      FULL: { variant: 'destructive', text: 'Full' },
      CANCELLED: { variant: 'destructive', text: 'Cancelled' },
      PENDING: { variant: 'secondary', text: 'Pending' },
      CONFIRMED: { variant: 'default', text: 'Confirmed' },
      COMPLETED: { variant: 'default', text: 'Completed' },
      NO_SHOW: { variant: 'destructive', text: 'No Show' }
    };

    const config = statusConfig[status] || { variant: 'secondary', text: status };
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return timeString;
  };

  const formatWeekBasedInfo = (clinicDay) => {
    if (!clinicDay.isWeekBased) return null;

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const selectedDays = clinicDay.selectedDaysOfWeek.map(day => daysOfWeek[day]).join(', ');

    return `${clinicDay.numberOfWeeks} week(s) - ${selectedDays}`;
  };

  // Calendar helper functions
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const getWeekDates = (startDate, weekIndex) => {
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + (weekIndex * 7));
    const weekDates = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      weekDates.push(date);
    }

    return weekDates;
  };

  const isDateSelected = (date, selectedDates) => {
    return selectedDates.some(selectedDate =>
      selectedDate.toDateString() === date.toDateString()
    );
  };

  const isDateInRange = (date, startDate, numberOfWeeks) => {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (numberOfWeeks * 7) - 1);
    return date >= startDate && date <= endDate;
  };

  const getCalendarWeeks = (startDate, numberOfWeeks) => {
    const weeks = [];
    for (let i = 0; i < numberOfWeeks; i++) {
      weeks.push(getWeekDates(startDate, i));
    }
    return weeks;
  };

  const getDayName = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  };

  const getDayNumber = (date) => {
    return date.getDate();
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPastDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Google Calendar style functions
  const getToday = () => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  const getWeekStart = (date) => {
    const weekStart = new Date(date);
    const dayOfWeek = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - dayOfWeek);
    return weekStart;
  };

  const getGoogleCalendarWeeks = (startDate, numberOfWeeks) => {
    const weeks = [];
    const weekStart = getWeekStart(startDate);

    for (let i = 0; i < numberOfWeeks; i++) {
      const weekDates = [];
      for (let j = 0; j < 7; j++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + (i * 7) + j);
        weekDates.push(date);
      }
      weeks.push(weekDates);
    }
    return weeks;
  };

  const formatDateForDisplay = (date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getMonthName = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const isCurrentWeek = (weekDates) => {
    const today = new Date();
    return weekDates.some(date =>
      date.getTime() >= getWeekStart(today).getTime() &&
      date.getTime() < getWeekStart(today).getTime() + (7 * 24 * 60 * 60 * 1000)
    );
  };

  // Statistics helper functions
  const filterBookingsByDateRange = (bookings, startDate, endDate) => {
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.clinicDay.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return bookingDate >= start && bookingDate <= end;
    });
  };

  const filterBookingsByStatus = (bookings, status) => {
    if (status === 'ALL') return bookings;
    return bookings.filter(booking => booking.status === status);
  };

  const generateCumulativeData = (bookings, startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const data = [];
    let cumulative = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayBookings = bookings.filter(booking =>
        booking.clinicDay.date === dateStr
      );
      cumulative += dayBookings.length;

      data.push({
        date: dateStr,
        cumulative: cumulative,
        daily: dayBookings.length,
        formattedDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }

    return data;
  };

  const generateStatusBreakdown = (bookings) => {
    const statusCount = {};
    bookings.forEach(booking => {
      statusCount[booking.status] = (statusCount[booking.status] || 0) + 1;
    });
    return statusCount;
  };

  const generateStatusChartData = (bookings) => {
    const statusCount = generateStatusBreakdown(bookings);
    const colors = {
      PENDING: '#fbbf24',
      CONFIRMED: '#3b82f6',
      COMPLETED: '#10b981',
      CANCELLED: '#ef4444',
      NO_SHOW: '#dc2626'
    };

    return Object.entries(statusCount).map(([status, count]) => ({
      name: status.replace('_', ' '),
      value: count,
      color: colors[status] || '#6b7280'
    }));
  };

  const generateWeeklyTrends = (bookings, startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const data = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 7)) {
      const weekEnd = new Date(d);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.clinicDay.date);
        return bookingDate >= d && bookingDate <= weekEnd;
      });

      const weekLabel = `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

      data.push({
        week: weekLabel,
        bookings: weekBookings.length,
        startDate: d.toISOString().split('T')[0]
      });
    }

    return data;
  };

  const generateDailyTrends = (bookings, startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const data = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayBookings = bookings.filter(booking =>
        booking.clinicDay.date === dateStr
      );

      data.push({
        date: dateStr,
        bookings: dayBookings.length,
        formattedDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }

    return data;
  };

  const getUniqueStudents = (bookings) => {
    const studentIds = new Set();
    bookings.forEach(booking => {
      studentIds.add(booking.student.id);
    });
    return studentIds.size;
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    const reportContent = generateReportContent();
    printWindow.document.write(reportContent);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadReport = async () => {
    try {
      const doc = generateWordDocument();
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research-clinic-report-${dateRange.startDate}-to-${dateRange.endDate}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error generating Word document:', error);
      toast.error('Failed to generate Word document');
    }
  };

  const generateReportContent = () => {
    const filteredBookings = filterBookingsByStatus(
      filterBookingsByDateRange(bookings, dateRange.startDate, dateRange.endDate),
      selectedStatus
    );

    const statusBreakdown = generateStatusBreakdown(filteredBookings);
    const uniqueStudents = getUniqueStudents(filteredBookings);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Research Clinic Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { margin-bottom: 30px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f2f2f2; }
            .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
            .status-pending { background-color: #fef3c7; color: #92400e; }
            .status-confirmed { background-color: #dbeafe; color: #1e40af; }
            .status-completed { background-color: #d1fae5; color: #065f46; }
            .status-cancelled { background-color: #fee2e2; color: #991b1b; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Research Clinic Report</h1>
            <p>Period: ${dateRange.startDate} to ${dateRange.endDate}</p>
            <p>Status Filter: ${selectedStatus === 'ALL' ? 'All Statuses' : selectedStatus}</p>
          </div>
          
          <div class="summary">
            <h2>Summary</h2>
            <p><strong>Total Bookings:</strong> ${filteredBookings.length}</p>
            <p><strong>Unique Students:</strong> ${uniqueStudents}</p>
          </div>
          
          <div class="status-breakdown">
            <h2>Status Breakdown</h2>
            <table class="table">
              <thead>
                <tr><th>Status</th><th>Count</th><th>Percentage</th></tr>
              </thead>
              <tbody>
                ${Object.entries(statusBreakdown).map(([status, count]) => `
                  <tr>
                    <td><span class="status-badge status-${status.toLowerCase()}">${status}</span></td>
                    <td>${count}</td>
                    <td>${((count / filteredBookings.length) * 100).toFixed(1)}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="bookings-detail">
            <h2>Detailed Bookings</h2>
            <table class="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Email</th>
                  <th>Clinic Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${filteredBookings.map(booking => `
                  <tr>
                    <td>${booking.student?.studentUser?.fullName}</td>
                    <td>${booking.student?.studentUser?.email}</td>
                    <td>${formatDate(booking.clinicDay.date)}</td>
                    <td>${formatTime(booking.clinicDay.startTime)} - ${formatTime(booking.clinicDay.endTime)}</td>
                    <td><span class="status-badge status-${booking.status.toLowerCase()}">${booking.status}</span></td>
                    <td>${booking.notes || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;
  };

  const generateWordDocument = () => {
    const filteredBookings = filterBookingsByStatus(
      filterBookingsByDateRange(bookings, dateRange.startDate, dateRange.endDate),
      selectedStatus
    );

    const statusBreakdown = generateStatusBreakdown(filteredBookings);
    const uniqueStudents = getUniqueStudents(filteredBookings);

    // Create document sections
    const children = [
      // Title
      new Paragraph({
        text: "Research Clinic Report",
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }),

      // Report Period
      new Paragraph({
        children: [
          new TextRun({
            text: "Report Period: ",
            bold: true
          }),
          new TextRun({
            text: `${dateRange.startDate} to ${dateRange.endDate}`
          })
        ],
        spacing: { after: 200 }
      }),

      // Status Filter
      new Paragraph({
        children: [
          new TextRun({
            text: "Status Filter: ",
            bold: true
          }),
          new TextRun({
            text: selectedStatus === 'ALL' ? 'All Statuses' : selectedStatus
          })
        ],
        spacing: { after: 400 }
      }),

      // Summary Section
      new Paragraph({
        text: "Summary",
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 }
      }),

      new Paragraph({
        children: [
          new TextRun({
            text: "Total Bookings: ",
            bold: true
          }),
          new TextRun({
            text: filteredBookings.length.toString()
          })
        ],
        spacing: { after: 100 }
      }),

      new Paragraph({
        children: [
          new TextRun({
            text: "Unique Students: ",
            bold: true
          }),
          new TextRun({
            text: uniqueStudents.toString()
          })
        ],
        spacing: { after: 400 }
      }),

      // Status Breakdown Section
      new Paragraph({
        text: "Status Breakdown",
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 }
      }),

      // Status Breakdown Table
      new DocxTable({
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
        rows: [
          // Header row
          new DocxTableRow({
            children: [
              new DocxTableCell({
                children: [new Paragraph({ text: "Status", alignment: AlignmentType.CENTER })],
                width: { size: 30, type: WidthType.PERCENTAGE },
                shading: { fill: "F2F2F2" }
              }),
              new DocxTableCell({
                children: [new Paragraph({ text: "Count", alignment: AlignmentType.CENTER })],
                width: { size: 35, type: WidthType.PERCENTAGE },
                shading: { fill: "F2F2F2" }
              }),
              new DocxTableCell({
                children: [new Paragraph({ text: "Percentage", alignment: AlignmentType.CENTER })],
                width: { size: 35, type: WidthType.PERCENTAGE },
                shading: { fill: "F2F2F2" }
              })
            ]
          }),
          // Data rows
          ...Object.entries(statusBreakdown).map(([status, count]) =>
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  children: [new Paragraph({ text: status.replace('_', ' ') })],
                  width: { size: 30, type: WidthType.PERCENTAGE }
                }),
                new DocxTableCell({
                  children: [new Paragraph({ text: count.toString(), alignment: AlignmentType.CENTER })],
                  width: { size: 35, type: WidthType.PERCENTAGE }
                }),
                new DocxTableCell({
                  children: [new Paragraph({
                    text: `${((count / filteredBookings.length) * 100).toFixed(1)}%`,
                    alignment: AlignmentType.CENTER
                  })],
                  width: { size: 35, type: WidthType.PERCENTAGE }
                })
              ]
            })
          )
        ],
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
          insideVertical: { style: BorderStyle.SINGLE, size: 1 },
        }
      }),

      new Paragraph({ spacing: { after: 400 } }),

      // Detailed Bookings Section
      new Paragraph({
        text: "Detailed Bookings",
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 }
      }),

      // Detailed Bookings Table
      new DocxTable({
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
        rows: [
          // Header row
          new DocxTableRow({
            children: [
              new DocxTableCell({
                children: [new Paragraph({ text: "Student Name", alignment: AlignmentType.CENTER })],
                width: { size: 20, type: WidthType.PERCENTAGE },
                shading: { fill: "F2F2F2" }
              }),
              new DocxTableCell({
                children: [new Paragraph({ text: "Email", alignment: AlignmentType.CENTER })],
                width: { size: 25, type: WidthType.PERCENTAGE },
                shading: { fill: "F2F2F2" }
              }),
              new DocxTableCell({
                children: [new Paragraph({ text: "Clinic Date", alignment: AlignmentType.CENTER })],
                width: { size: 20, type: WidthType.PERCENTAGE },
                shading: { fill: "F2F2F2" }
              }),
              new DocxTableCell({
                children: [new Paragraph({ text: "Time", alignment: AlignmentType.CENTER })],
                width: { size: 15, type: WidthType.PERCENTAGE },
                shading: { fill: "F2F2F2" }
              }),
              new DocxTableCell({
                children: [new Paragraph({ text: "Status", alignment: AlignmentType.CENTER })],
                width: { size: 10, type: WidthType.PERCENTAGE },
                shading: { fill: "F2F2F2" }
              }),
              new DocxTableCell({
                children: [new Paragraph({ text: "Notes", alignment: AlignmentType.CENTER })],
                width: { size: 10, type: WidthType.PERCENTAGE },
                shading: { fill: "F2F2F2" }
              })
            ]
          }),
          // Data rows
          ...filteredBookings.map(booking =>
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  children: [new Paragraph({ text: booking.student?.studentUser?.fullName })],
                  width: { size: 20, type: WidthType.PERCENTAGE }
                }),
                new DocxTableCell({
                  children: [new Paragraph({ text: booking.student?.studentUser?.email })],
                  width: { size: 25, type: WidthType.PERCENTAGE }
                }),
                new DocxTableCell({
                  children: [new Paragraph({ text: formatDate(booking.clinicDay.date) })],
                  width: { size: 20, type: WidthType.PERCENTAGE }
                }),
                new DocxTableCell({
                  children: [new Paragraph({
                    text: `${formatTime(booking.clinicDay.startTime)} - ${formatTime(booking.clinicDay.endTime)}`
                  })],
                  width: { size: 15, type: WidthType.PERCENTAGE }
                }),
                new DocxTableCell({
                  children: [new Paragraph({ text: booking.status })],
                  width: { size: 10, type: WidthType.PERCENTAGE }
                }),
                new DocxTableCell({
                  children: [new Paragraph({ text: booking.notes || '-' })],
                  width: { size: 10, type: WidthType.PERCENTAGE }
                })
              ]
            })
          )
        ],
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
          insideVertical: { style: BorderStyle.SINGLE, size: 1 },
        }
      }),

      new Paragraph({ spacing: { after: 400 } }),

      // Students Summary Section
      new Paragraph({
        text: "Students Summary",
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 }
      }),

      // Students Summary Table
      new DocxTable({
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
        rows: [
          // Header row
          new DocxTableRow({
            children: [
              new DocxTableCell({
                children: [new Paragraph({ text: "Student Name", alignment: AlignmentType.CENTER })],
                width: { size: 40, type: WidthType.PERCENTAGE },
                shading: { fill: "F2F2F2" }
              }),
              new DocxTableCell({
                children: [new Paragraph({ text: "Email", alignment: AlignmentType.CENTER })],
                width: { size: 40, type: WidthType.PERCENTAGE },
                shading: { fill: "F2F2F2" }
              }),
              new DocxTableCell({
                children: [new Paragraph({ text: "Total Bookings", alignment: AlignmentType.CENTER })],
                width: { size: 20, type: WidthType.PERCENTAGE },
                shading: { fill: "F2F2F2" }
              })
            ]
          }),
          // Data rows
          ...(() => {
            const uniqueStudentBookings = filteredBookings.reduce((acc, booking) => {
              const studentId = booking.student.id;
              if (!acc[studentId]) {
                acc[studentId] = {
                  student: booking.student,
                  bookings: []
                };
              }
              acc[studentId].bookings.push(booking);
              return acc;
            }, {});

            return Object.values(uniqueStudentBookings).map(({ student, bookings }) =>
              new DocxTableRow({
                children: [
                  new DocxTableCell({
                    children: [new Paragraph({ text: student.studentUser?.fullName })],
                    width: { size: 40, type: WidthType.PERCENTAGE }
                  }),
                  new DocxTableCell({
                    children: [new Paragraph({ text: student.studentUser?.email })],
                    width: { size: 40, type: WidthType.PERCENTAGE }
                  }),
                  new DocxTableCell({
                    children: [new Paragraph({
                      text: bookings.length.toString(),
                      alignment: AlignmentType.CENTER
                    })],
                    width: { size: 20, type: WidthType.PERCENTAGE }
                  })
                ]
              })
            );
          })()
        ],
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
          insideVertical: { style: BorderStyle.SINGLE, size: 1 },
        }
      }),

      new Paragraph({ spacing: { after: 400 } }),

      // Footer
      new Paragraph({
        text: `Report generated from DRIMS on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 }
      })
    ];

    return new Document({
      sections: [
        {
          properties: {},
          children: children
        }
      ]
    });
  };

  if (clinicDaysLoading || bookingsLoading || statisticsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Research Clinic Management</h1>
          <p className="text-gray-600 mt-2">
            Manage clinic days, view bookings, and track statistics
          </p>
        </div>

      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="clinic-days">Clinic Days</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
        </TabsList>

        {/* Clinic Days Tab */}
        <TabsContent value="clinic-days" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Clinic Days</CardTitle>
                  <CardDescription>
                    Manage research clinic sessions and availability
                  </CardDescription>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Weekly Schedule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {clinicDays.map((day) => (
                  <div key={day.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{formatDate(day.date)}</span>
                        {day.isWeekBased && (
                          <Badge variant="secondary" className="text-xs">
                            Week Schedule
                          </Badge>
                        )}
                        {day.parentClinicDayId && (
                          <Badge variant="outline" className="text-xs">
                            Generated Session
                          </Badge>
                        )}
                      </div>
                      {getStatusBadge(day.status)}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>{formatTime(day.startTime)} - {formatTime(day.endTime)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="h-4 w-4" />
                        <span>{day._count.bookings}/{day.maxBookings} booked</span>
                      </div>
                      {day.description && (
                        <p className="text-sm text-gray-600">{day.description}</p>
                      )}
                      {formatWeekBasedInfo(day) && (
                        <p className="text-sm text-green-600 font-medium">
                          {formatWeekBasedInfo(day)}
                        </p>
                      )}
                      {day.parentClinicDayId && (
                        <p className="text-sm text-gray-600">
                          Generated from week-based clinic day
                        </p>
                      )}
                      {!day.parentClinicDayId && day.isWeekBased && (
                        <div className="text-sm text-blue-600">
                          <p className="font-medium">Week-based Configuration:</p>
                          <p>• {day.numberOfWeeks} week(s)</p>
                          <p>• {day.selectedDaysOfWeek.length} day(s) per week</p>
                          <p>• Total sessions: {day.numberOfWeeks * day.selectedDaysOfWeek.length}</p>
                        </div>
                      )}
                      {day.zoomLink && (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <Video className="h-4 w-4" />
                          <a href={day.zoomLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            Zoom Link
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Show generated sessions for week-based clinic days */}
                    {!day.parentClinicDayId && day.isWeekBased && day.generatedSessions && day.generatedSessions.length > 0 && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold text-gray-800 mb-2">Generated Sessions:</h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {day.generatedSessions.map((session) => (
                            <div key={session.id} className="flex items-center justify-between text-sm p-2 bg-white rounded border">
                              <div>
                                <span className="font-medium">{formatDate(session.date)}</span>
                                <span className="text-gray-500 ml-2">
                                  {formatTime(session.startTime)} - {formatTime(session.endTime)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">
                                  {session._count.bookings}/{session.maxBookings}
                                </span>
                                {getStatusBadge(session.status)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(day)}
                        disabled={isCreating || isUpdating || isDeleting}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClinicDay(day.id)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bookings</CardTitle>
              <CardDescription>
                View and manage student bookings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Clinic Day</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {booking.student?.studentUser?.fullName}
                          </div>
                          <div className="text-sm text-gray-600">
                            {booking.student?.studentUser?.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {formatDate(booking.clinicDay.date)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatTime(booking.clinicDay.startTime)} - {formatTime(booking.clinicDay.endTime)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(booking.status)}
                      </TableCell>
                      <TableCell>
                        {booking.notes || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => openBookingDialog(booking)}
                          variant="outline"
                          size="sm"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics" className="space-y-6">
          {/* Filters and Controls */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Statistics & Reports</CardTitle>
                  <CardDescription>
                    Analyze research clinic data with customizable filters and generate reports
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handlePrintReport} variant="outline">
                    <Printer className="h-4 w-4 mr-2" />
                    Print Report
                  </Button>
                  <Button onClick={handleDownloadReport} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="statusFilter">Status Filter</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      <SelectItem value="NO_SHOW">No Show</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filtered Statistics */}
          {(() => {
            const filteredBookings = filterBookingsByStatus(
              filterBookingsByDateRange(bookings, dateRange.startDate, dateRange.endDate),
              selectedStatus
            );
            const statusBreakdown = generateStatusBreakdown(filteredBookings);
            const uniqueStudents = getUniqueStudents(filteredBookings);
            const cumulativeData = generateCumulativeData(filteredBookings, dateRange.startDate, dateRange.endDate);
            const weeklyData = generateWeeklyTrends(filteredBookings, dateRange.startDate, dateRange.endDate);
            const dailyData = generateDailyTrends(filteredBookings, dateRange.startDate, dateRange.endDate);

            return (
              <>
                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Filtered Bookings</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{filteredBookings.length}</div>
                      <p className="text-xs text-muted-foreground">
                        {selectedStatus === 'ALL' ? 'All statuses' : selectedStatus}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Unique Students</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{uniqueStudents}</div>
                      <p className="text-xs text-muted-foreground">
                        {dateRange.startDate} to {dateRange.endDate}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {filteredBookings.length > 0
                          ? Math.round((statusBreakdown.COMPLETED || 0) / filteredBookings.length * 100)
                          : 0}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Completed vs total bookings
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts Section */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Cumulative Bookings Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Cumulative Bookings Over Time</CardTitle>
                      <CardDescription>
                        Shows the cumulative number of bookings from {dateRange.startDate} to {dateRange.endDate}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={cumulativeData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="formattedDate"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            fontSize={12}
                          />
                          <YAxis fontSize={12} />
                          <Tooltip
                            formatter={(value, name) => [value, name === 'cumulative' ? 'Cumulative Bookings' : 'Daily Bookings']}
                            labelFormatter={(label) => `Date: ${label}`}
                          />
                          <Area
                            type="monotone"
                            dataKey="cumulative"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.3}
                            name="Cumulative Bookings"
                          />
                          <Line
                            type="monotone"
                            dataKey="daily"
                            stroke="#ef4444"
                            strokeWidth={2}
                            name="Daily Bookings"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Weekly Trends Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Weekly Booking Trends</CardTitle>
                      <CardDescription>
                        Number of bookings per week in the selected period
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={weeklyData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="week"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            fontSize={12}
                          />
                          <YAxis fontSize={12} />
                          <Tooltip
                            formatter={(value) => [value, 'Bookings']}
                            labelFormatter={(label) => `Week: ${label}`}
                          />
                          <Bar dataKey="bookings" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Additional Charts */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Daily Trends Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Daily Booking Trends</CardTitle>
                      <CardDescription>
                        Number of bookings per day in the selected period
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={dailyData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="formattedDate"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            fontSize={12}
                          />
                          <YAxis fontSize={12} />
                          <Tooltip
                            formatter={(value) => [value, 'Bookings']}
                            labelFormatter={(label) => `Date: ${label}`}
                          />
                          <Line
                            type="monotone"
                            dataKey="bookings"
                            stroke="#8b5cf6"
                            strokeWidth={3}
                            dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Status Distribution Pie Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Status Distribution</CardTitle>
                      <CardDescription>
                        Distribution of bookings by status
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={generateStatusChartData(filteredBookings)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {generateStatusChartData(filteredBookings).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value, name) => [value, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Status Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Status Breakdown</CardTitle>
                    <CardDescription>
                      Distribution of bookings by status in the selected period
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(statusBreakdown).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full" style={{
                              backgroundColor:
                                status === 'PENDING' ? '#fbbf24' :
                                  status === 'CONFIRMED' ? '#3b82f6' :
                                    status === 'COMPLETED' ? '#10b981' :
                                      status === 'CANCELLED' ? '#ef4444' :
                                        status === 'NO_SHOW' ? '#dc2626' : '#6b7280'
                            }} />
                            <span className="font-medium">{status.replace('_', ' ')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                              {((count / filteredBookings.length) * 100).toFixed(1)}%
                            </span>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Students List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Students Who Booked ({uniqueStudents})</CardTitle>
                    <CardDescription>
                      List of students who made bookings in the selected period
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {(() => {
                        const uniqueStudentBookings = filteredBookings.reduce((acc, booking) => {
                          const studentId = booking.student.id;
                          if (!acc[studentId]) {
                            acc[studentId] = {
                              student: booking.student,
                              bookings: []
                            };
                          }
                          acc[studentId].bookings.push(booking);
                          return acc;
                        }, {});

                        return Object.values(uniqueStudentBookings).map(({ student, bookings }) => (
                          <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{student.studentUser?.fullName}</div>
                              <div className="text-sm text-gray-600">{student.studentUser?.email}</div>
                              <div className="text-xs text-gray-500">
                                {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {bookings.map(booking => (
                                <Badge key={booking.id} variant="outline" className="text-xs">
                                  {booking.status}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* Create Clinic Day Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Weekly Clinic Schedule</DialogTitle>
            <DialogDescription>
              Set up a weekly research clinic schedule with multiple sessions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxBookings">Max Bookings per Session</Label>
                <Input
                  id="maxBookings"
                  type="number"
                  value={formData.maxBookings}
                  onChange={(e) => setFormData({ ...formData, maxBookings: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="numberOfWeeks">Number of Weeks</Label>
                <Input
                  id="numberOfWeeks"
                  type="number"
                  min="1"
                  max="12"
                  value={formData.numberOfWeeks}
                  onChange={(e) => setFormData({ ...formData, numberOfWeeks: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="zoomLink">Zoom Link (Optional)</Label>
              <Input
                id="zoomLink"
                type="url"
                placeholder="https://zoom.us/j/..."
                value={formData.zoomLink}
                onChange={(e) => setFormData({ ...formData, zoomLink: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Session description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Week Configuration */}
            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Weekly Schedule Configuration</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weekStartDate">Week Start Date</Label>
                  <Input
                    id="weekStartDate"
                    type="date"
                    value={formData.weekStartDate}
                    onChange={(e) => setFormData({ ...formData, weekStartDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Select Days of the Week</Label>
                <div className="grid grid-cols-7 gap-2 mt-2">
                  {[
                    { value: 0, label: 'Sun' },
                    { value: 1, label: 'Mon' },
                    { value: 2, label: 'Tue' },
                    { value: 3, label: 'Wed' },
                    { value: 4, label: 'Thu' },
                    { value: 5, label: 'Fri' },
                    { value: 6, label: 'Sat' }
                  ].map((day) => (
                    <div key={day.value} className="flex items-center space-x-1">
                      <input
                        type="checkbox"
                        id={`day-${day.value}`}
                        checked={formData.selectedDaysOfWeek.includes(day.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              selectedDaysOfWeek: [...formData.selectedDaysOfWeek, day.value]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selectedDaysOfWeek: formData.selectedDaysOfWeek.filter(d => d !== day.value)
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <Label htmlFor={`day-${day.value}`} className="text-xs">{day.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calendar View */}
              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Calendar Preview</h3>
                </div>

                {formData.weekStartDate && (
                  <div className="space-y-3">
                    <div>
                      <Label>Calendar Start Date</Label>
                      <Input
                        type="date"
                        value={calendarStartDate || formData.weekStartDate}
                        onChange={(e) => setCalendarStartDate(e.target.value)}
                      />
                    </div>

                    {/* Calendar Display */}
                    <div className="border rounded-lg p-3 bg-white">
                      {/* Calendar Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-blue-600" />
                          <h4 className="text-lg font-semibold text-gray-900">
                            {getMonthName(new Date(calendarStartDate || formData.weekStartDate))}
                          </h4>
                        </div>
                        <div className="text-sm text-gray-600">
                          {formData.numberOfWeeks} week{formData.numberOfWeeks > 1 ? 's' : ''}
                        </div>
                      </div>

                      {/* Day Headers */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                          <div key={day} className="text-center text-xs font-medium text-gray-500 p-2">
                            {day}
                          </div>
                        ))}
                      </div>

                      {calendarStartDate && (
                        <div className="space-y-1">
                          {getGoogleCalendarWeeks(new Date(calendarStartDate), formData.numberOfWeeks).map((week, weekIndex) => (
                            <div
                              key={weekIndex}
                              className={`grid grid-cols-7 gap-1 rounded-lg ${isCurrentWeek(week) ? 'bg-blue-50 border border-blue-200' : ''
                                }`}
                            >
                              {week.map((date, dayIndex) => {
                                const isSelected = formData.selectedDaysOfWeek.includes(date.getDay()) &&
                                  !isPastDate(date);
                                const isTodayDate = isToday(date);
                                const isPast = isPastDate(date);

                                return (
                                  <div
                                    key={dayIndex}
                                    className={`
                                      p-2 text-center border-r border-b border-gray-200 cursor-pointer
                                      hover:bg-gray-50 transition-colors
                                      ${isTodayDate ? 'bg-blue-100 border-blue-300 font-bold text-blue-900' : ''}
                                      ${isPast ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'}
                                      ${isSelected ? 'bg-green-100 border-green-300 font-semibold text-green-800' : ''}
                                      ${!isPast && !isSelected && !isTodayDate ? 'hover:bg-gray-50' : ''}
                                    `}
                                    onClick={() => {
                                      if (!isPast) {
                                        const dayOfWeek = date.getDay();
                                        if (formData.selectedDaysOfWeek.includes(dayOfWeek)) {
                                          setFormData({
                                            ...formData,
                                            selectedDaysOfWeek: formData.selectedDaysOfWeek.filter(d => d !== dayOfWeek)
                                          });
                                        } else {
                                          setFormData({
                                            ...formData,
                                            selectedDaysOfWeek: [...formData.selectedDaysOfWeek, dayOfWeek]
                                          });
                                        }
                                      }
                                    }}
                                  >
                                    <div className="text-xs text-gray-500 mb-1">
                                      {formatDateForDisplay(date)}
                                    </div>
                                    <div className="text-lg font-medium">
                                      {getDayNumber(date)}
                                    </div>
                                    {isSelected && (
                                      <div className="text-xs text-green-600 mt-1">✓</div>
                                    )}
                                    {isTodayDate && (
                                      <div className="text-xs text-blue-600 mt-1">Today</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Selected Dates Summary */}
                      {formData.selectedDaysOfWeek.length > 0 && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <h4 className="font-semibold text-green-800 mb-2">Selected Days:</h4>
                          <div className="text-sm text-green-700">
                            {formData.selectedDaysOfWeek.map(day => {
                              const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                              return dayNames[day];
                            }).join(', ')}
                          </div>
                          <div className="text-xs text-green-600 mt-1">
                            {formData.numberOfWeeks} week(s) × {formData.selectedDaysOfWeek.length} day(s) = {formData.numberOfWeeks * formData.selectedDaysOfWeek.length} total sessions
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateClinicDay}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create Weekly Schedule'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Clinic Day Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Weekly Clinic Schedule</DialogTitle>
            <DialogDescription>
              Update weekly clinic schedule details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-startTime">Start Time</Label>
                <Input
                  id="edit-startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-endTime">End Time</Label>
                <Input
                  id="edit-endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-maxBookings">Max Bookings per Session</Label>
                <Input
                  id="edit-maxBookings"
                  type="number"
                  value={formData.maxBookings}
                  onChange={(e) => setFormData({ ...formData, maxBookings: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="edit-numberOfWeeks">Number of Weeks</Label>
                <Input
                  id="edit-numberOfWeeks"
                  type="number"
                  min="1"
                  max="12"
                  value={formData.numberOfWeeks}
                  onChange={(e) => setFormData({ ...formData, numberOfWeeks: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-zoomLink">Zoom Link (Optional)</Label>
              <Input
                id="edit-zoomLink"
                type="url"
                placeholder="https://zoom.us/j/..."
                value={formData.zoomLink}
                onChange={(e) => setFormData({ ...formData, zoomLink: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                placeholder="Session description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Week Configuration */}
            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Weekly Schedule Configuration</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-weekStartDate">Week Start Date</Label>
                  <Input
                    id="edit-weekStartDate"
                    type="date"
                    value={formData.weekStartDate}
                    onChange={(e) => setFormData({ ...formData, weekStartDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Select Days of the Week</Label>
                <div className="grid grid-cols-7 gap-2 mt-2">
                  {[
                    { value: 0, label: 'Sun' },
                    { value: 1, label: 'Mon' },
                    { value: 2, label: 'Tue' },
                    { value: 3, label: 'Wed' },
                    { value: 4, label: 'Thu' },
                    { value: 5, label: 'Fri' },
                    { value: 6, label: 'Sat' }
                  ].map((day) => (
                    <div key={day.value} className="flex items-center space-x-1">
                      <input
                        type="checkbox"
                        id={`edit-day-${day.value}`}
                        checked={formData.selectedDaysOfWeek.includes(day.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              selectedDaysOfWeek: [...formData.selectedDaysOfWeek, day.value]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selectedDaysOfWeek: formData.selectedDaysOfWeek.filter(d => d !== day.value)
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <Label htmlFor={`edit-day-${day.value}`} className="text-xs">{day.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calendar View for Edit */}
              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Calendar Preview</h3>
                </div>

                {formData.weekStartDate && (
                  <div className="space-y-3">
                    <div>
                      <Label>Calendar Start Date</Label>
                      <Input
                        type="date"
                        value={calendarStartDate || formData.weekStartDate}
                        onChange={(e) => setCalendarStartDate(e.target.value)}
                      />
                    </div>

                    {/* Calendar Display */}
                    <div className="border rounded-lg p-3 bg-white">
                      {/* Calendar Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-blue-600" />
                          <h4 className="text-lg font-semibold text-gray-900">
                            {getMonthName(new Date(calendarStartDate || formData.weekStartDate))}
                          </h4>
                        </div>
                        <div className="text-sm text-gray-600">
                          {formData.numberOfWeeks} week{formData.numberOfWeeks > 1 ? 's' : ''}
                        </div>
                      </div>

                      {/* Day Headers */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                          <div key={day} className="text-center text-xs font-medium text-gray-500 p-2">
                            {day}
                          </div>
                        ))}
                      </div>

                      {calendarStartDate && (
                        <div className="space-y-1">
                          {getGoogleCalendarWeeks(new Date(calendarStartDate), formData.numberOfWeeks).map((week, weekIndex) => (
                            <div
                              key={weekIndex}
                              className={`grid grid-cols-7 gap-1 rounded-lg ${isCurrentWeek(week) ? 'bg-blue-50 border border-blue-200' : ''
                                }`}
                            >
                              {week.map((date, dayIndex) => {
                                const isSelected = formData.selectedDaysOfWeek.includes(date.getDay()) &&
                                  !isPastDate(date);
                                const isTodayDate = isToday(date);
                                const isPast = isPastDate(date);

                                return (
                                  <div
                                    key={dayIndex}
                                    className={`
                                      p-2 text-center border-r border-b border-gray-200 cursor-pointer
                                      hover:bg-gray-50 transition-colors
                                      ${isTodayDate ? 'bg-blue-100 border-blue-300 font-bold text-blue-900' : ''}
                                      ${isPast ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'}
                                      ${isSelected ? 'bg-green-100 border-green-300 font-semibold text-green-800' : ''}
                                      ${!isPast && !isSelected && !isTodayDate ? 'hover:bg-gray-50' : ''}
                                    `}
                                    onClick={() => {
                                      if (!isPast) {
                                        const dayOfWeek = date.getDay();
                                        if (formData.selectedDaysOfWeek.includes(dayOfWeek)) {
                                          setFormData({
                                            ...formData,
                                            selectedDaysOfWeek: formData.selectedDaysOfWeek.filter(d => d !== dayOfWeek)
                                          });
                                        } else {
                                          setFormData({
                                            ...formData,
                                            selectedDaysOfWeek: [...formData.selectedDaysOfWeek, dayOfWeek]
                                          });
                                        }
                                      }
                                    }}
                                  >
                                    <div className="text-xs text-gray-500 mb-1">
                                      {formatDateForDisplay(date)}
                                    </div>
                                    <div className="text-lg font-medium">
                                      {getDayNumber(date)}
                                    </div>
                                    {isSelected && (
                                      <div className="text-xs text-green-600 mt-1">✓</div>
                                    )}
                                    {isTodayDate && (
                                      <div className="text-xs text-blue-600 mt-1">Today</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Selected Dates Summary */}
                      {formData.selectedDaysOfWeek.length > 0 && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <h4 className="font-semibold text-green-800 mb-2">Selected Days:</h4>
                          <div className="text-sm text-green-700">
                            {formData.selectedDaysOfWeek.map(day => {
                              const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                              return dayNames[day];
                            }).join(', ')}
                          </div>
                          <div className="text-xs text-green-600 mt-1">
                            {formData.numberOfWeeks} week(s) × {formData.selectedDaysOfWeek.length} day(s) = {formData.numberOfWeeks * formData.selectedDaysOfWeek.length} total sessions
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateClinicDay}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  'Update Weekly Schedule'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Details Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              View and update booking information
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Student Name</Label>
                  <p className="text-sm font-medium">{selectedBooking.student?.studentUser?.fullName}</p>
                </div>
                <div>
                  <Label>Student Email</Label>
                  <p className="text-sm font-medium">{selectedBooking.student?.studentUser?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Clinic Date</Label>
                  <p className="text-sm font-medium">{formatDate(selectedBooking.clinicDay.date)}</p>
                </div>
                <div>
                  <Label>Time</Label>
                  <p className="text-sm font-medium">
                    {formatTime(selectedBooking.clinicDay.startTime)} - {formatTime(selectedBooking.clinicDay.endTime)}
                  </p>
                </div>
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={selectedBooking.status}
                  onValueChange={(value) => handleUpdateBookingStatus(selectedBooking.id, value)}
                  disabled={isUpdatingBooking}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="NO_SHOW">No Show</SelectItem>
                  </SelectContent>
                </Select>
                {isUpdatingBooking && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 mt-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                    Updating status...
                  </div>
                )}
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={selectedBooking.notes || ''}
                  onChange={(e) => {
                    setSelectedBooking({
                      ...selectedBooking,
                      notes: e.target.value
                    });
                  }}
                  placeholder="Add notes about this booking..."
                />
              </div>

              <div>
                <Label>Feedback</Label>
                <Textarea
                  value={selectedBooking.feedback || ''}
                  onChange={(e) => {
                    setSelectedBooking({
                      ...selectedBooking,
                      feedback: e.target.value
                    });
                  }}
                  placeholder="Add feedback after the session..."
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowBookingDialog(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    handleUpdateBookingStatus(
                      selectedBooking.id,
                      selectedBooking.status,
                      selectedBooking.notes,
                      selectedBooking.feedback
                    );
                  }}
                  disabled={isUpdatingBooking}
                >
                  {isUpdatingBooking ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    'Update Booking'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResearchClinicManagement;
