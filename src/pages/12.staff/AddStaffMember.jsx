import React, { useState } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useCreateStaffMember, useGetAllCampuses, useGetAllSchools, useGetAllDepartments } from '../../store/tanstackStore/services/queries';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const AddStaffMember = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
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
    // Institutional affiliations (for internal staff)
    schoolId: undefined,
    departmentId: undefined,
    campusId: undefined,
    // External institution information (for external staff)
    externalInstitution: '',
    externalDepartment: '',
    externalLocation: '',
    isExternal: false,
    // Role assignments
    supervisorId: undefined,
    examinerId: undefined,
    reviewerId: undefined,
    panelistId: undefined
  });

  const [customTitle, setCustomTitle] = useState('');

  // Queries for institutional data
  const { data: campuses } = useGetAllCampuses();
  const { data: schools } = useGetAllSchools();
  const { data: departments = [] } = useGetAllDepartments(formData.schoolId);

  // Ensure data is always an array
  const campusesArray = Array.isArray(campuses?.campuses) ? campuses.campuses : [];
  const schoolsArray = Array.isArray(schools?.schools) ? schools.schools : [];
  const departmentsArray = Array.isArray(departments?.departments) ? departments.departments : [];

  // Mutation for creating staff member
  const createStaffMemberMutation = useCreateStaffMember();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCancel = () => {
    // Reset form data
    setFormData({
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
      schoolId: undefined,
      departmentId: undefined,
      campusId: undefined,
      externalInstitution: '',
      externalDepartment: '',
      externalLocation: '',
      isExternal: false,
      supervisorId: undefined,
      examinerId: undefined,
      reviewerId: undefined,
      panelistId: undefined
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

    createStaffMemberMutation.mutate(submitData, {
      onSuccess: () => {
        toast.success('Staff member created successfully');
        onSuccess();
      },
      onError: (error) => {
        console.error('Error creating staff member:', error);
        toast.error(error.response?.data?.message || 'Failed to create staff member');
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Add New Staff Member</h2>
        <p className="text-muted-foreground">
          Add a new academic staff member to the system.
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
                  disabled={createStaffMemberMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Select
                  value={formData.title}
                  onValueChange={(value) => handleInputChange('title', value)}
                  disabled={createStaffMemberMutation.isPending}
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
                    disabled={createStaffMemberMutation.isPending}
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
                  disabled={createStaffMemberMutation.isPending}
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
                  disabled={createStaffMemberMutation.isPending}
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
                  disabled={createStaffMemberMutation.isPending}
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
                  disabled={createStaffMemberMutation.isPending}
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
                disabled={createStaffMemberMutation.isPending}
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
                    disabled={createStaffMemberMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="externalDepartment">External Department</Label>
                  <Input
                    id="externalDepartment"
                    value={formData.externalDepartment}
                    onChange={(e) => handleInputChange('externalDepartment', e.target.value)}
                    placeholder="Enter department"
                    disabled={createStaffMemberMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="externalLocation">External Location</Label>
                  <Input
                    id="externalLocation"
                    value={formData.externalLocation}
                    onChange={(e) => handleInputChange('externalLocation', e.target.value)}
                    placeholder="Enter location"
                    disabled={createStaffMemberMutation.isPending}
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
                    onValueChange={(value) => handleInputChange('campusId', value)}
                    disabled={createStaffMemberMutation.isPending}
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
                      handleInputChange('schoolId', value);
                      handleInputChange('departmentId', undefined); // Reset department when school changes
                    }}
                    disabled={createStaffMemberMutation.isPending}
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
                    onValueChange={(value) => handleInputChange('departmentId', value)}
                    disabled={createStaffMemberMutation.isPending || !formData.schoolId}
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
                  disabled={createStaffMemberMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Input
                  id="specialization"
                  value={formData.specialization}
                  onChange={(e) => handleInputChange('specialization', e.target.value)}
                  placeholder="e.g., Computer Science, Mathematics"
                  disabled={createStaffMemberMutation.isPending}
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
                disabled={createStaffMemberMutation.isPending}
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
                disabled={createStaffMemberMutation.isPending}
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
                disabled={createStaffMemberMutation.isPending}
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
                disabled={createStaffMemberMutation.isPending}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                disabled={createStaffMemberMutation.isPending}
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
            disabled={createStaffMemberMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createStaffMemberMutation.isPending}
          >
            {createStaffMemberMutation.isPending ? 'Creating...' : 'Create Staff Member'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddStaffMember; 