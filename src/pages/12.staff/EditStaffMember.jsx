import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useUpdateStaffMember, useGetAllCampuses, useGetAllSchools, useGetAllDepartments } from '../../store/tanstackStore/services/queries';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const EditStaffMember = ({ staffMember, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState(() => {
    if (staffMember) {
      return {
        name: staffMember.name || '',
        title: staffMember.title || '',
        email: staffMember.email || '',
        secondaryEmail: staffMember.secondaryEmail || '',
        phone: staffMember.phone || '',
        secondaryPhone: staffMember.secondaryPhone || '',
        designation: staffMember.designation || '',
        specialization: staffMember.specialization || '',
        qualifications: staffMember.qualifications || '',
        experience: staffMember.experience || '',
        bio: staffMember.bio || '',
        profileImage: staffMember.profileImage || '',
        isActive: staffMember.isActive ?? true,
        isExternal: staffMember.isExternal || false,
        // Internal institutional affiliations - extract IDs from nested objects
        schoolId: staffMember.school?.id || staffMember.schoolId || undefined,
        departmentId: staffMember.department?.id || staffMember.departmentId || undefined,
        campusId: staffMember.campus?.id || staffMember.campusId || undefined,
        // External institution information
        externalInstitution: staffMember.externalInstitution || '',
        externalDepartment: staffMember.externalDepartment || '',
        externalLocation: staffMember.externalLocation || '',
        // Role assignments
        supervisorId: staffMember.supervisorId || undefined,
        examinerId: staffMember.examinerId || undefined,
        reviewerId: staffMember.reviewerId || undefined,
        panelistId: staffMember.panelistId || undefined
      };
    }
    return {
      name: '',
      title: '',
      email: '',
      secondaryEmail: '',
      phone: '',
      secondaryPhone: '',
      designation: '',
      specialization: '',
      qualifications: '',
      experience: '',
      bio: '',
      profileImage: '',
      isActive: true,
      isExternal: false,
      // Internal institutional affiliations
      schoolId: undefined,
      departmentId: undefined,
      campusId: undefined,
      // External institution information
      externalInstitution: '',
      externalDepartment: '',
      externalLocation: '',
      // Role assignments
      supervisorId: undefined,
      examinerId: undefined,
      reviewerId: undefined,
      panelistId: undefined
    };
  });

  // Queries for institutional data
  const { data: campuses } = useGetAllCampuses();
  const { data: schools } = useGetAllSchools();
  
  // Get the current schoolId for departments query - prioritize staff member data
  const currentSchoolId = staffMember?.school?.id || staffMember?.schoolId || formData.schoolId;
  const { data: departments } = useGetAllDepartments(formData?.schoolId);

  // Ensure data is always an array
  const campusesArray = Array.isArray(campuses?.campuses) ? campuses.campuses : [];
  const schoolsArray = Array.isArray(schools?.schools) ? schools.schools : [];
  const departmentsArray = Array.isArray(departments?.departments) ? departments.departments : [];



  // Mutation for updating staff member
  const updateStaffMemberMutation = useUpdateStaffMember();

  const STANDARD_TITLES = ['Prof.', 'Assoc. Prof.', 'Dr.', 'Mr.', 'Mrs.', 'Ms.'];
  
  const [customTitle, setCustomTitle] = useState(() => {
    if (staffMember?.title && !STANDARD_TITLES.includes(staffMember.title)) {
      return staffMember.title;
    }
    return '';
  });

  useEffect(() => {
    if (formData.title && !STANDARD_TITLES.includes(formData.title) && formData.title !== 'Other') {
       setCustomTitle(formData.title);
       setFormData(prev => ({ ...prev, title: 'Other' }));
    }
  }, []);

  useEffect(() => {
    if (staffMember) {
      const newFormData = {
        name: staffMember.name || '',
        title: staffMember.title || '',
        email: staffMember.email || '',
        secondaryEmail: staffMember.secondaryEmail || '',
        phone: staffMember.phone || '',
        secondaryPhone: staffMember.secondaryPhone || '',
        designation: staffMember.designation || '',
        specialization: staffMember.specialization || '',
        qualifications: staffMember.qualifications || '',
        experience: staffMember.experience || '',
        bio: staffMember.bio || '',
        profileImage: staffMember.profileImage || '',
        isActive: staffMember.isActive ?? true,
        isExternal: staffMember.isExternal || false,
        // Internal institutional affiliations - extract IDs from nested objects
        schoolId: staffMember.school?.id || staffMember.schoolId || undefined,
        departmentId: staffMember.department?.id || staffMember.departmentId || undefined,
        campusId: staffMember.campus?.id || staffMember.campusId || undefined,
        // External institution information
        externalInstitution: staffMember.externalInstitution || '',
        externalDepartment: staffMember.externalDepartment || '',
        externalLocation: staffMember.externalLocation || '',
        // Role assignments
        supervisorId: staffMember.supervisorId || undefined,
        examinerId: staffMember.examinerId || undefined,
        reviewerId: staffMember.reviewerId || undefined,
        panelistId: staffMember.panelistId || undefined
      };
      
      if (staffMember.title && !STANDARD_TITLES.includes(staffMember.title)) {
        setCustomTitle(staffMember.title);
        newFormData.title = 'Other';
      }

      setFormData(newFormData);
    }
  }, [staffMember?.id]); // Only depend on the staff member ID, not the entire object

  // Monitor formData changes
  useEffect(() => {
  }, [formData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCancel = () => {
    // Reset form data to original values
    setFormData({
      name: staffMember.name || '',
      title: staffMember.title || '',
      email: staffMember.email || '',
      secondaryEmail: staffMember.secondaryEmail || '',
      phone: staffMember.phone || '',
      secondaryPhone: staffMember.secondaryPhone || '',
      designation: staffMember.designation || '',
      specialization: staffMember.specialization || '',
      qualifications: staffMember.qualifications || '',
      experience: staffMember.experience || '',
      bio: staffMember.bio || '',
      profileImage: staffMember.profileImage || '',
      isActive: staffMember.isActive ?? true,
      schoolId: staffMember.school?.id || staffMember.schoolId || undefined,
      departmentId: staffMember.department?.id || staffMember.departmentId || undefined,
      campusId: staffMember.campus?.id || staffMember.campusId || undefined,
      externalInstitution: staffMember.externalInstitution || '',
      externalDepartment: staffMember.externalDepartment || '',
      externalLocation: staffMember.externalLocation || '',
      isExternal: staffMember.isExternal || false,
      supervisorId: staffMember.supervisorId || undefined,
      examinerId: staffMember.examinerId || undefined,
      reviewerId: staffMember.reviewerId || undefined,
      panelistId: staffMember.panelistId || undefined
    });
    // Close dialog without showing success message
    onCancel();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Prepare the data based on whether it's internal or external
    const submitData = {
      ...formData,
      // Convert undefined values to null for API
      schoolId: formData.schoolId || null,
      departmentId: formData.departmentId || null,
      campusId: formData.campusId || null,
      supervisorId: formData.supervisorId || null,
      examinerId: formData.examinerId || null,
      reviewerId: formData.reviewerId || null,
      panelistId: formData.panelistId || null,
      // Clear external fields if internal
      ...(formData.isExternal ? {
        schoolId: null,
        departmentId: null,
        campusId: null
      } : {
        externalInstitution: null,
        externalDepartment: null,
        externalLocation: null
      })
    };

    if (formData.title === 'Other' && customTitle) {
      submitData.title = customTitle;
    }

    updateStaffMemberMutation.mutate({
      id: staffMember.id,
      data: submitData
    }, {
      onSuccess: () => {
        toast.success('Staff member updated successfully');
        onSuccess();
      },
      onError: (error) => {
        console.error('Error updating staff member:', error);
        toast.error(error.response?.data?.message || 'Failed to update staff member');
      },
    });
  };

  if (!staffMember) {
    return <div>Loading...</div>;
  }

  // Additional check to ensure staff member has required data
  if (!staffMember.id) {
    return <div>Invalid staff member data</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Edit Staff Member</h2>
        <p className="text-muted-foreground">
          Update staff member information.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter full name"
                  required
                  disabled={updateStaffMemberMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Select
                  value={formData.title}
                  onValueChange={(value) => handleInputChange('title', value)}
                  disabled={updateStaffMemberMutation.isPending}
                >
                  <SelectTrigger id="title">
                    <SelectValue placeholder="Select title" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Prof.">Prof.</SelectItem>
                    <SelectItem value="Assoc. Prof.">Assoc. Prof.</SelectItem>
                    <SelectItem value="Dr.">Dr.</SelectItem>
                    <SelectItem value="Mr.">Mr.</SelectItem>
                    <SelectItem value="Mrs.">Mrs.</SelectItem>
                    <SelectItem value="Ms.">Ms.</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {formData.title === 'Other' && (
                  <Input
                    className="mt-2"
                    placeholder="Specify title"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    disabled={updateStaffMemberMutation.isPending}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                  required
                  disabled={updateStaffMemberMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryEmail">Secondary Email</Label>
                <Input
                  id="secondaryEmail"
                  type="email"
                  value={formData.secondaryEmail}
                  onChange={(e) => handleInputChange('secondaryEmail', e.target.value)}
                  placeholder="Enter secondary email"
                  disabled={updateStaffMemberMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <PhoneInput
                  id="phone"
                  international
                  defaultCountry="UG"
                  value={formData.phone}
                  onChange={(value) => handleInputChange('phone', value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={updateStaffMemberMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryPhone">Secondary Phone Number</Label>
                <PhoneInput
                  id="secondaryPhone"
                  international
                  defaultCountry="UG"
                  value={formData.secondaryPhone}
                  onChange={(value) => handleInputChange('secondaryPhone', value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={updateStaffMemberMutation.isPending}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Institutional Affiliation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="isExternal"
                checked={formData.isExternal}
                onCheckedChange={(checked) => handleInputChange('isExternal', checked)}
                disabled={updateStaffMemberMutation.isPending}
              />
              <Label htmlFor="isExternal">External Staff Member</Label>
            </div>

            {formData.isExternal ? (
              // External institution fields
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="externalInstitution">External Institution *</Label>
                  <Input
                    id="externalInstitution"
                    value={formData.externalInstitution}
                    onChange={(e) => handleInputChange('externalInstitution', e.target.value)}
                    placeholder="Enter institution name"
                    required
                    disabled={updateStaffMemberMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="externalDepartment">External Department</Label>
                  <Input
                    id="externalDepartment"
                    value={formData.externalDepartment}
                    onChange={(e) => handleInputChange('externalDepartment', e.target.value)}
                    placeholder="Enter department"
                    disabled={updateStaffMemberMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="externalLocation">External Location</Label>
                  <Input
                    id="externalLocation"
                    value={formData.externalLocation}
                    onChange={(e) => handleInputChange('externalLocation', e.target.value)}
                    placeholder="Enter location"
                    disabled={updateStaffMemberMutation.isPending}
                  />
                </div>
              </div>
            ) : (
              // Internal institutional relations
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="campus">Campus</Label>
                  <Select
                    value={formData.campusId || ''}
                    onValueChange={(value) => handleInputChange('campusId', value || undefined)}
                    disabled={updateStaffMemberMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select campus" />
                    </SelectTrigger>
                    <SelectContent>
                      {campusesArray.map((campus) => (
                        <SelectItem key={campus.id} value={campus.id}>
                          {campus.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school">School</Label>
                  <Select
                    value={formData.schoolId || ''}
                    onValueChange={(value) => {
                      handleInputChange('schoolId', value || undefined);
                      handleInputChange('departmentId', undefined); // Reset department when school changes
                    }}
                    disabled={updateStaffMemberMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select school" />
                    </SelectTrigger>
                    <SelectContent>
                      {schoolsArray
                        .filter(school => !formData.campusId || school.campusId === formData.campusId)
                        .map((school) => (
                          <SelectItem key={school.id} value={school.id}>
                            {school.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={formData.departmentId || ''}
                    onValueChange={(value) => handleInputChange('departmentId', value || undefined)}
                    disabled={updateStaffMemberMutation.isPending || !formData.schoolId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentsArray.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Professional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => handleInputChange('designation', e.target.value)}
                  placeholder="e.g., Senior Lecturer, Professor"
                  disabled={updateStaffMemberMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Input
                  id="specialization"
                  value={formData.specialization}
                  onChange={(e) => handleInputChange('specialization', e.target.value)}
                  placeholder="e.g., Computer Science, Mathematics"
                  disabled={updateStaffMemberMutation.isPending}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qualifications">Qualifications</Label>
              <Textarea
                id="qualifications"
                value={formData.qualifications}
                onChange={(e) => handleInputChange('qualifications', e.target.value)}
                placeholder="Enter academic qualifications"
                rows={3}
                disabled={updateStaffMemberMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="experience">Experience</Label>
              <Textarea
                id="experience"
                value={formData.experience}
                onChange={(e) => handleInputChange('experience', e.target.value)}
                placeholder="Enter professional experience"
                rows={3}
                disabled={updateStaffMemberMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Enter brief biography"
                rows={4}
                disabled={updateStaffMemberMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profileImage">Profile Image URL</Label>
              <Input
                id="profileImage"
                value={formData.profileImage}
                onChange={(e) => handleInputChange('profileImage', e.target.value)}
                placeholder="Enter profile image URL"
                disabled={updateStaffMemberMutation.isPending}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                disabled={updateStaffMemberMutation.isPending}
              />
              <Label htmlFor="isActive">Active Status</Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleCancel}
            disabled={updateStaffMemberMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={updateStaffMemberMutation.isPending}
          >
            {updateStaffMemberMutation.isPending ? 'Updating...' : 'Update Staff Member'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditStaffMember; 