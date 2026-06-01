import React, { useState } from 'react';
import { Calendar, Users, TrendingUp, TrendingDown, BarChart3, Filter, Download, Printer, Search, ArrowUpRight, ArrowDownRight, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGetReallocationStatistics, useGetAllSupervisors } from '../../store/tanstackStore/services/queries';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Document, Packer, Paragraph, TextRun, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle } from 'docx';

const ReallocationMonitoring = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 90 days
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedSupervisor, setSelectedSupervisor] = useState('ALL');

  // Get data
  const { data: reallocationData, isLoading: reallocationLoading } = useGetReallocationStatistics({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    supervisorId: selectedSupervisor !== 'ALL' ? selectedSupervisor : undefined
  });

  const { data: supervisorsData, isLoading: supervisorsLoading } = useGetAllSupervisors();


  const statistics = reallocationData?.statistics || {};
  const supervisorStats = reallocationData?.supervisorStats || [];
  const monthlyTrends = reallocationData?.monthlyTrends || [];
  const commonReasons = reallocationData?.commonReasons || [];
  const activities = reallocationData?.activities || [];
  const supervisors = supervisorsData?.supervisors || [];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatMonth = (monthKey) => {
    const [year, month] = monthKey.split('-');
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
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
      a.download = `reallocation-report-${dateRange.startDate}-to-${dateRange.endDate}.docx`;
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
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Supervisor Reallocation Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { margin-bottom: 30px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f2f2f2; }
            .stat-card { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Supervisor Reallocation Report</h1>
            <p>Period: ${dateRange.startDate} to ${dateRange.endDate}</p>
            <p>Supervisor Filter: ${selectedSupervisor === 'ALL' ? 'All Supervisors' : supervisors.find(s => s.id === selectedSupervisor)?.user?.name || 'Unknown Supervisor'}</p>
          </div>
          
          <div class="summary">
            <h2>Summary Statistics</h2>
            <div class="stat-card">
              <p><strong>Total Reallocations:</strong> ${statistics.totalReallocations || 0}</p>
              <p><strong>Unique Students Reallocated:</strong> ${statistics.uniqueStudentsReallocated || 0}</p>
              <p><strong>Supervisors Who Lost Students:</strong> ${statistics.supervisorsWhoLostStudents || 0}</p>
              <p><strong>Supervisors Who Gained Students:</strong> ${statistics.supervisorsWhoGainedStudents || 0}</p>
              <p><strong>Average Reallocations per Student:</strong> ${statistics.averageReallocationsPerStudent || 0}</p>
            </div>
          </div>
          
          <div class="supervisor-stats">
            <h2>Supervisor Statistics</h2>
            <table class="table">
              <thead>
                <tr>
                  <th>Supervisor</th>
                  <th>Students Lost</th>
                  <th>Students Gained</th>
                  <th>Net Change</th>
                </tr>
              </thead>
              <tbody>
                ${supervisorStats.map(supervisor => `
                  <tr>
                    <td>${supervisor.name}</td>
                    <td>${supervisor.studentsLost}</td>
                    <td>${supervisor.studentsGained}</td>
                    <td style="color: ${supervisor.netChange >= 0 ? 'green' : 'red'}">${supervisor.netChange >= 0 ? '+' : ''}${supervisor.netChange}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="reasons">
            <h2>Common Reasons for Reallocation</h2>
            <table class="table">
              <thead>
                <tr><th>Reason</th><th>Count</th></tr>
              </thead>
              <tbody>
                ${commonReasons.map(reason => `
                  <tr>
                    <td>${reason.reason}</td>
                    <td>${reason.count}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="activities">
            <h2>Detailed Reallocation Activities</h2>
            <table class="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Student</th>
                  <th>From Supervisor</th>
                  <th>To Supervisor</th>
                  <th>Changed By</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                ${activities.map(activity => `
                  <tr>
                    <td>${formatDate(activity.timestamp)}</td>
                    <td>${activity.studentName}</td>
                    <td>${activity.oldSupervisorName}</td>
                    <td>${activity.newSupervisorName}</td>
                    <td>${activity.changedBy}</td>
                    <td>${activity.reason || 'No reason provided'}</td>
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
    const children = [
      // Title
      new Paragraph({
        text: "Supervisor Reallocation Report",
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

      // Supervisor Filter
      new Paragraph({
        children: [
          new TextRun({
            text: "Supervisor Filter: ",
            bold: true
          }),
          new TextRun({
            text: selectedSupervisor === 'ALL' ? 'All Supervisors' : supervisors.find(s => s.id === selectedSupervisor)?.user?.name || 'Unknown Supervisor'
          })
        ],
        spacing: { after: 400 }
      }),

      // Summary Section
      new Paragraph({
        text: "Summary Statistics",
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 }
      }),

      new Paragraph({
        children: [
          new TextRun({
            text: "Total Reallocations: ",
            bold: true
          }),
          new TextRun({
            text: (statistics.totalReallocations || 0).toString()
          })
        ],
        spacing: { after: 100 }
      }),

      new Paragraph({
        children: [
          new TextRun({
            text: "Unique Students Reallocated: ",
            bold: true
          }),
          new TextRun({
            text: (statistics.uniqueStudentsReallocated || 0).toString()
          })
        ],
        spacing: { after: 100 }
      }),

      new Paragraph({
        children: [
          new TextRun({
            text: "Supervisors Who Lost Students: ",
            bold: true
          }),
          new TextRun({
            text: (statistics.supervisorsWhoLostStudents || 0).toString()
          })
        ],
        spacing: { after: 100 }
      }),

      new Paragraph({
        children: [
          new TextRun({
            text: "Supervisors Who Gained Students: ",
            bold: true
          }),
          new TextRun({
            text: (statistics.supervisorsWhoGainedStudents || 0).toString()
          })
        ],
        spacing: { after: 400 }
      }),

      // Supervisor Statistics Section
      new Paragraph({
        text: "Supervisor Statistics",
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 }
      }),

      // Supervisor Statistics Table
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
                children: [new Paragraph({ text: "Supervisor", alignment: AlignmentType.CENTER })],
                width: { size: 40, type: WidthType.PERCENTAGE },
                shading: { fill: "F2F2F2" }
              }),
              new DocxTableCell({
                children: [new Paragraph({ text: "Students Lost", alignment: AlignmentType.CENTER })],
                width: { size: 20, type: WidthType.PERCENTAGE },
                shading: { fill: "F2F2F2" }
              }),
              new DocxTableCell({
                children: [new Paragraph({ text: "Students Gained", alignment: AlignmentType.CENTER })],
                width: { size: 20, type: WidthType.PERCENTAGE },
                shading: { fill: "F2F2F2" }
              }),
              new DocxTableCell({
                children: [new Paragraph({ text: "Net Change", alignment: AlignmentType.CENTER })],
                width: { size: 20, type: WidthType.PERCENTAGE },
                shading: { fill: "F2F2F2" }
              })
            ]
          }),
          // Data rows
          ...supervisorStats.map(supervisor =>
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  children: [new Paragraph({ text: supervisor.name })],
                  width: { size: 40, type: WidthType.PERCENTAGE }
                }),
                new DocxTableCell({
                  children: [new Paragraph({ text: supervisor.studentsLost.toString(), alignment: AlignmentType.CENTER })],
                  width: { size: 20, type: WidthType.PERCENTAGE }
                }),
                new DocxTableCell({
                  children: [new Paragraph({ text: supervisor.studentsGained.toString(), alignment: AlignmentType.CENTER })],
                  width: { size: 20, type: WidthType.PERCENTAGE }
                }),
                new DocxTableCell({
                  children: [new Paragraph({
                    text: `${supervisor.netChange >= 0 ? '+' : ''}${supervisor.netChange}`,
                    alignment: AlignmentType.CENTER
                  })],
                  width: { size: 20, type: WidthType.PERCENTAGE }
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

      // Common Reasons Section
      new Paragraph({
        text: "Common Reasons for Reallocation",
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 }
      }),

      // Common Reasons Table
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
                children: [new Paragraph({ text: "Reason", alignment: AlignmentType.CENTER })],
                width: { size: 70, type: WidthType.PERCENTAGE },
                shading: { fill: "F2F2F2" }
              }),
              new DocxTableCell({
                children: [new Paragraph({ text: "Count", alignment: AlignmentType.CENTER })],
                width: { size: 30, type: WidthType.PERCENTAGE },
                shading: { fill: "F2F2F2" }
              })
            ]
          }),
          // Data rows
          ...commonReasons.map(reason =>
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  children: [new Paragraph({ text: reason.reason })],
                  width: { size: 70, type: WidthType.PERCENTAGE }
                }),
                new DocxTableCell({
                  children: [new Paragraph({ text: reason.count.toString(), alignment: AlignmentType.CENTER })],
                  width: { size: 30, type: WidthType.PERCENTAGE }
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

  if (reallocationLoading || supervisorsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Ensure supervisors array exists before rendering
  if (!supervisors || supervisors.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Supervisor Reallocation Monitoring</h1>
          <p className="text-gray-600">No supervisors found. Please ensure supervisors are available in the system.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Supervisor Reallocation Monitoring</h1>
          <p className="text-gray-600 mt-2">
            Track and analyze supervisor changes and student reallocations
          </p>
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter reallocation data by date range and supervisor
          </CardDescription>
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
              <Label htmlFor="supervisorFilter">Supervisor Filter</Label>
              <Select value={selectedSupervisor} onValueChange={setSelectedSupervisor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Supervisors</SelectItem>
                  {supervisors.map((supervisor) => (
                    <SelectItem key={supervisor.id} value={supervisor.id}>
                      {supervisor?.name || 'Unknown Supervisor'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reallocations</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalReallocations || 0}</div>
            <p className="text-xs text-muted-foreground">
              All supervisor changes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students Reallocated</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.uniqueStudentsReallocated || 0}</div>
            <p className="text-xs text-muted-foreground">
              Unique students affected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Supervisors Lost Students</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{statistics.supervisorsWhoLostStudents || 0}</div>
            <p className="text-xs text-muted-foreground">
              Supervisors who lost students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Supervisors Gained Students</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statistics.supervisorsWhoGainedStudents || 0}</div>
            <p className="text-xs text-muted-foreground">
              Supervisors who gained students
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="supervisors">Supervisor Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Monthly Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Reallocation Trends</CardTitle>
                <CardDescription>
                  Number of reallocations per month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={formatMonth}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip
                      formatter={(value) => [value, 'Reallocations']}
                      labelFormatter={(label) => `Month: ${formatMonth(label)}`}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Common Reasons Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Common Reasons for Reallocation</CardTitle>
                <CardDescription>
                  Top reasons for supervisor changes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={commonReasons}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ reason, percent }) => `${reason} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {commonReasons.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [value, 'Count']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Supervisor Analysis Tab */}
        <TabsContent value="supervisors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Supervisor Reallocation Analysis</CardTitle>
              <CardDescription>
                Detailed breakdown of supervisor gains and losses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supervisor</TableHead>
                    <TableHead className="text-center">Students Lost</TableHead>
                    <TableHead className="text-center">Students Gained</TableHead>
                    <TableHead className="text-center">Net Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supervisorStats.map((supervisor) => (
                    <TableRow key={supervisor.id}>
                      <TableCell className="font-medium">{supervisor.name}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <ArrowDownRight className="h-4 w-4 text-red-500" />
                          {supervisor.studentsLost}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <ArrowUpRight className="h-4 w-4 text-green-500" />
                          {supervisor.studentsGained}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={supervisor.netChange >= 0 ? "default" : "destructive"}>
                          {supervisor.netChange >= 0 ? '+' : ''}{supervisor.netChange}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Reallocation Trends Over Time</CardTitle>
              <CardDescription>
                Line chart showing reallocation patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={formatMonth}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip
                    formatter={(value) => [value, 'Reallocations']}
                    labelFormatter={(label) => `Month: ${formatMonth(label)}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Reallocation Activities</CardTitle>
              <CardDescription>
                Complete list of all supervisor changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {activities.map((activity) => (
                  <div key={activity.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {formatDate(activity.timestamp)}
                        </span>
                      </div>
                      <Badge variant="outline">
                        Changed by {activity.changedBy}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">Student</Label>
                        <p className="font-medium">{activity.studentName}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">From Supervisor</Label>
                        <p className="font-medium text-red-600">{activity.oldSupervisorName}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">To Supervisor</Label>
                        <p className="font-medium text-green-600">{activity.newSupervisorName}</p>
                      </div>
                    </div>

                    {activity.reason && (
                      <div className="mt-3">
                        <Label className="text-xs text-gray-500">Reason</Label>
                        <p className="text-sm text-gray-700">{activity.reason}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReallocationMonitoring; 