/* eslint-disable react/prop-types */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { createSupervisorFromStaffService } from "@/store/tanstackStore/services/api";
import { useGetStaffMembersForSupervisor } from "@/store/tanstackStore/services/queries";
import { queryClient } from "@/utils/tanstack";
import { toast } from "sonner";
import { Search, ArrowLeft, Building, Globe, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const AddSupervisor = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStaffMember, setSelectedStaffMember] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [tempPassword, setTempPassword] = useState("");

  // Fetch staff members who don't have supervisorId and are internal
  const { data: staffMembersData, isLoading } = useGetStaffMembersForSupervisor();

  // Helper function to get initials
  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper function to get institutional information
  const getInstitutionalInfo = (member) => {
    // Handle different possible institution data structures
    let primary = "Not specified";
    let secondary = "";
    
    if (member.school) {
      // Handle school information (this is the actual data structure we have)
      if (typeof member.school === 'string') {
        primary = member.school;
      } else if (typeof member.school === 'object' && member.school.name) {
        primary = member.school.name;
      }
    } else if (member.institution) {
      if (typeof member.institution === 'string') {
        primary = member.institution;
      } else if (typeof member.institution === 'object' && member.institution.name) {
        primary = member.institution.name;
      } else if (typeof member.institution === 'object') {
        primary = member.institution.id || member.institution.code || "Institution";
      }
    } else if (member.organization) {
      primary = member.organization;
    } else if (member.campus) {
      // Use campus as fallback if no institution/school data
      if (typeof member.campus === 'string') {
        primary = member.campus;
      } else if (typeof member.campus === 'object' && member.campus.name) {
        primary = member.campus.name;
      }
    }
    
    // Handle secondary information
    if (member.department) {
      if (typeof member.department === 'string') {
        secondary = member.department;
      } else if (typeof member.department === 'object' && member.department.name) {
        secondary = member.department.name;
      }
    } else if (member.faculty) {
      secondary = member.faculty;
    } else if (member.school && typeof member.school === 'object' && member.school.department) {
      secondary = member.school.department;
    } else if (member.institution && typeof member.institution === 'object' && member.institution.department) {
      secondary = member.institution.department;
    }
    
    let icon = <Building className="h-4 w-4 text-muted-foreground" />;
    if (member.isExternal) {
      icon = <Globe className="h-4 w-4 text-blue-600" />;
    }
    
    return { primary, secondary, icon };
  };

  // Mutation for creating supervisor from staff member
  const createSupervisorMutation = useMutation({
    mutationFn: ({staffMemberId, password}) => createSupervisorFromStaffService(staffMemberId, password),
    onSuccess: (data) => {
      toast.success(data?.message || "Supervisor created successfully", {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: () => toast.dismiss()
        }
      });
      
      queryClient.invalidateQueries(['faculty']);
      queryClient.invalidateQueries(['supervisor']);
      queryClient.invalidateQueries(['staffMembersForSupervisor']);
      setShowConfirmDialog(false);
      setTempPassword("");
      navigate('/faculty', { replace: true });
    },
    onError: (error) => {
      console.error("Error creating supervisor:", error);
      toast.error(error?.message || "Error creating supervisor. Please try again.", {
        duration: 40000,
        action: {
          label: "Close",
          onClick: () => toast.dismiss()
        }
      });
    }
  });

  // Filter staff members based on search
  const filteredStaffMembers = useMemo(() => {
    const staffMembers = staffMembersData || [];
    
    if (!searchTerm) return staffMembers;
    
    return staffMembers.filter((person) => {
      const matchesSearch =
        person.name
          ?.toLowerCase()
          ?.includes(searchTerm?.toLowerCase()) ||
        person.email?.toLowerCase()?.includes(searchTerm?.toLowerCase());
      
      return matchesSearch;
    });
  }, [staffMembersData, searchTerm]);

  const handleCreateSupervisor = (staffMember) => {
    setSelectedStaffMember(staffMember);
    setTempPassword("");
    setShowConfirmDialog(true);
  };

  const confirmCreateSupervisor = () => {
    if (selectedStaffMember) {
      createSupervisorMutation.mutate({
        staffMemberId: selectedStaffMember.id,
        password: tempPassword || undefined
      });
    }
  };

  return (
    <div className="min-h-full bg-[#E5E7EB]">
      <div className="bg-[#E5E7EB] min-h-[55px] border-b border-b-secondary-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4"></div>
      </div>

      <div className="py-6">
        <div className="max-w-7xl mx-auto mb-8 px-4 sm:px-6 md:px-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/faculty')}
              variant="outline"
              className="inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Create Supervisor from Staff Member
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Select a staff member who doesn't have a supervisor role to create a new supervisor
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Available Staff Members</CardTitle>
                  <CardDescription>
                    Staff members who don't have a supervisor role and are internal
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Institutional Affiliation</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Campus</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaffMembers.length > 0 ? (
                      filteredStaffMembers.map((person) => {
                        const institutionalInfo = getInstitutionalInfo(person);
                        
                        // Safety check: ensure we have valid data
                        if (!person || typeof person !== 'object') {
                          return null;
                        }
                        
                        return (
                          <TableRow key={person.id}>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <Avatar>
                                  <AvatarImage src={person.profileImage} />
                                  <AvatarFallback>
                                    {getInitials(person.name || '')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{person.name || 'Unknown'}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {person.title} {person.designation && `• ${person.designation}`}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {institutionalInfo.icon}
                                <div>
                                  <div className="font-medium">{String(institutionalInfo.primary || 'Not specified')}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {String(institutionalInfo.secondary || '')}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{person.email || 'No email'}</div>
                                <div className="text-sm text-muted-foreground">
                                  {person.phone || 'No phone'}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground">
                                {person.campus?.name || "Not specified"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Badge variant={person.isActive ? "default" : "secondary"}>
                                  {person.isActive ? "Active" : "Inactive"}
                                </Badge>
                                {person.isExternal && (
                                  <Badge variant="outline" className="text-blue-600 border-blue-600">
                                    External
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                onClick={() => handleCreateSupervisor(person)}
                                variant="default"
                                size="sm"
                              >
                                Create Supervisor
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      }).filter(Boolean) // Remove any null entries
                    ) : (
                      <TableRow>
                        <TableCell colSpan="6" className="text-center py-8">
                          <div className="text-muted-foreground">
                            <p className="text-sm font-medium">No available staff members found</p>
                            <p className="text-xs mt-1">All staff members already have supervisor roles or are external</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && selectedStaffMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px] max-w-[90%] shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Confirm Supervisor Creation</h3>
              <button 
                onClick={() => setShowConfirmDialog(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                You are about to create a supervisor from this staff member:
              </p>
              <div className="bg-blue-50 rounded-md p-4">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={selectedStaffMember.profileImage} />
                    <AvatarFallback>
                      {getInitials(selectedStaffMember.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{selectedStaffMember.name}</div>
                    <div className="text-sm text-gray-500">{selectedStaffMember.email}</div>
                    <div className="text-sm text-gray-500">
                      {selectedStaffMember.title} {selectedStaffMember.designation && `• ${selectedStaffMember.designation}`}
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-4">
                This will create a new supervisor account and assign the supervisor role to this staff member.
              </p>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temporary Password (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="Enter a temporary password"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  If left blank, a random password will be generated. The supervisor can change this later.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setShowConfirmDialog(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmCreateSupervisor}
                disabled={createSupervisorMutation.isPending}
              >
                {createSupervisorMutation.isPending ? 'Creating...' : 'Create Supervisor'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddSupervisor;