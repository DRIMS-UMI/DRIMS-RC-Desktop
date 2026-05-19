import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { fetchAcmisStudentService } from "@/store/tanstackStore/services/api";
import { ROUTES } from "../../config/routes";
import { toast } from "sonner";
import { HiSearch, HiArrowRight, HiChevronLeft } from "react-icons/hi";
import { MdSchool, MdPerson, MdEmail, MdPhone, MdLocationOn } from "react-icons/md";

const ImportAcmisStudent = () => {
  const navigate = useNavigate();
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [acmisData, setAcmisData] = useState(null);

  const fetchAcmisMutation = useMutation({
    mutationFn: fetchAcmisStudentService,
    onSuccess: (data) => {
      setAcmisData(data.student);
      toast.success("Student found in ACMIS system");
    },
    onError: (error) => {
      toast.error(error.message || "Could not find student in ACMIS");
      setAcmisData(null);
    },
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (!registrationNumber.trim()) {
      toast.error("Please enter a registration number");
      return;
    }
    fetchAcmisMutation.mutate(registrationNumber);
  };

  const handleProceed = () => {
    if (!acmisData) return;

    // Map ACMIS data to DRIMS studentPersonalInfo structure
    const studentInfo = {
      title: acmisData.title || "",
      fullName: `${acmisData.first_name} ${acmisData.last_name}`,
      registrationNumber: acmisData.registration_number || "",
      email: acmisData.email || "",
      phoneNumber: acmisData.phone_number || "",
      gender: acmisData.gender || "",
      nationality: acmisData.nationality || "",
      address: acmisData.address || "",
      city: acmisData.city || "",
      country: acmisData.country || "",
      // Campus and School IDs would need to be mapped based on names or IDs from backend
      // For now, we'll let the user select them in the form
    };

    // Encrypt and store in localStorage to pre-populate AddStudent form
    const encryptedData = btoa(JSON.stringify(studentInfo));
    localStorage.setItem("studentPersonalInfo", encryptedData);
    
    // Also clear other steps to ensure a fresh start
    localStorage.removeItem("studentCourseApplication");
    localStorage.removeItem("studentUserAccess");

    toast.success("Data imported. Please complete the registration form.");
    navigate(ROUTES.STUDENT.ADD);
  };

  return (
    <div className="min-h-full bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(ROUTES.STUDENT.LIST)}
          className="flex items-center text-sm font-medium text-gray-600 hover:text-primary-600 mb-6 transition-colors"
        >
          <HiChevronLeft className="w-5 h-5 mr-1" />
          Back to Students
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-50 bg-gradient-to-r from-primary-600 to-primary-700">
            <h1 className="text-2xl font-bold text-white mb-2">Import from ACMIS</h1>
            <p className="text-primary-100 text-sm">
              Enter the student's institutional registration number to fetch their records from the ACMIS system.
            </p>
          </div>

          <div className="p-8">
            <form onSubmit={handleSearch} className="flex gap-3 mb-10">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HiSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="Enter Registration Number (e.g. 23/U/1234)"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all shadow-sm"
                />
              </div>
              <button
                type="submit"
                disabled={fetchAcmisMutation.isPending}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 focus:ring-4 focus:ring-primary-200 transition-all disabled:opacity-50 shadow-sm whitespace-nowrap"
              >
                {fetchAcmisMutation.isPending ? "Searching..." : "Fetch Records"}
              </button>
            </form>

            {acmisData ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 mb-8">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center">
                      <MdPerson className="w-5 h-5 mr-2 text-primary-500" />
                      Student Details Found
                    </h3>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-wider">
                      Verified
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                    <DetailItem icon={<MdPerson className="text-gray-400" />} label="Full Name" value={`${acmisData.title} ${acmisData.first_name} ${acmisData.last_name}`} />
                    <DetailItem icon={<MdEmail className="text-gray-400" />} label="Institutional Email" value={acmisData.email} />
                    <DetailItem icon={<MdPhone className="text-gray-400" />} label="Phone Number" value={acmisData.phone_number} />
                    <DetailItem icon={<MdSchool className="text-gray-400" />} label="Academic Program" value={`${acmisData.department_name}, ${acmisData.school_name}`} />
                    <DetailItem icon={<MdLocationOn className="text-gray-400" />} label="Campus" value={acmisData.campus_name} />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleProceed}
                    className="inline-flex items-center px-8 py-4 bg-primary-600 text-white rounded-lg text-base font-bold hover:bg-primary-700 hover:shadow-lg transition-all gap-2 group"
                  >
                    Proceed to Registration
                    <HiArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ) : (
              !fetchAcmisMutation.isPending && (
                <div className="text-center py-12 px-4 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                  <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-50">
                    <MdSchool className="w-8 h-8 text-gray-200" />
                  </div>
                  <p className="text-gray-500 font-medium italic">No records fetched yet. Search using a valid registration number.</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailItem = ({ icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5">{icon}</div>
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-700">{value || "N/A"}</p>
    </div>
  </div>
);

export default ImportAcmisStudent;
