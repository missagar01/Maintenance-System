import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Upload,
  CalendarPlus,
  Plus,
  Minus,
  Loader2Icon,
} from "lucide-react";
import toast from "react-hot-toast";

const NewMachine = () => {
  const navigate = useNavigate();

  const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbzudKkY63zbthWP_YcfyF-HnUOObG_XM9aS2JDCmTmcYLaY1OQq7ho6i085BXxu9N2E7Q/exec";
  const SHEET_NAME = "FormResponses";
  const SHEET_Id = "15SBKzTJKzaqhjPI5yt5tKkrd3tzNuhm_Q9-iDO8n0B0";
  const FOLDER_ID = "1ZMn-mLYxW3_RW4tCgMgesSet6ShgT1kS";

  const [formValues, setFormValues] = useState({
    serialNumber: "",
    machineName: "",
    model: "",
    manufacturer: "",
    department: "",
    location: "",
    purchaseDate: "",
    purchasePrice: "",
    vendor: "",
    warrantyExpiration: "",
    maintenanceSchedule: [],
    initialMaintenanceDate: "",
    note: "",
    tagNo: "", // New field for Tag No.
    userAllot: "", // New field for User Allot
  });

  const [userManualFile, setUserManualFile] = useState(null);
  const [purchaseBillFile, setPurchaseBillFile] = useState(null);
  const [sheetData, setSheetData] = useState([]);
  const [loaderSubmit, setLoaderSubmit] = useState(false);
  const [loaderSheetData, setLoaderSheetData] = useState(false);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [loaderMasterSheetData, setLoaderMasterSheetData] = useState(false);

  // Safe fetch function with error handling
  const safeFetch = async (url, options = {}) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load data. Please refresh the page.");
      return null;
    }
  };

  // Fetch sheet data with error handling
  const fetchSheetData = useCallback(async () => {
    try {
      setLoaderSheetData(true);
      const result = await safeFetch(
        `${SCRIPT_URL}?sheetId=${SHEET_Id}&sheet=${SHEET_NAME}`
      );

      if (result && result.success && result.table) {
        const headers = result.table.cols.map((col) => col.label);
        const rows = result.table.rows || [];

        // Transform rows into objects with key-value pairs
        const formattedRows = rows.map((rowObj) => {
          const row = rowObj.c || [];
          const rowData = {};
          row.forEach((cell, i) => {
            if (headers[i]) {
              rowData[headers[i]] = cell?.v || "";
            }
          });
          return rowData;
        });

        setSheetData(formattedRows);
      } else {
        console.error("Invalid response format:", result);
        setSheetData([]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setSheetData([]);
      toast.error("Failed to load existing machines data");
    } finally {
      setLoaderSheetData(false);
    }
  }, [SCRIPT_URL, SHEET_Id, SHEET_NAME]);

  // Fetch department options
  const fetchMasterSheetData = useCallback(async () => {
    const MASTER_SHEET_NAME = "Master";
    try {
      setLoaderMasterSheetData(true);
      const result = await safeFetch(
        `${SCRIPT_URL}?sheetId=${SHEET_Id}&sheet=${MASTER_SHEET_NAME}`
      );

      if (result && result.success && result.table) {
        const headers = result.table.cols.map((col) => col.label);
        const rows = result.table.rows || [];

        // Transform rows into objects with key-value pairs
        const formattedRows = rows.map((rowObj) => {
          const row = rowObj.c || [];
          const rowData = {};
          row.forEach((cell, i) => {
            if (headers[i]) {
              rowData[headers[i]] = cell ? cell.v : null;
            }
          });
          return rowData;
        });

        // Extract Department data - safely get unique departments
        const departments = formattedRows
          .map((row) => {
            // Get the second column (index 1) which should be column B
            const columnBValue = Object.values(row)[1];
            return columnBValue;
          })
          .filter((dept) => dept && dept.toString().trim() !== "")
          .filter((dept, index, self) => self.indexOf(dept) === index) // Remove duplicates
          .sort(); // Sort alphabetically

        setDepartmentOptions(departments);
      } else {
        console.error("Invalid master sheet response:", result);
        setDepartmentOptions([]);
      }
    } catch (err) {
      console.error("Master sheet fetch error:", err);
      setDepartmentOptions([]);
      toast.error("Failed to load department options");
    } finally {
      setLoaderMasterSheetData(false);
    }
  }, [SCRIPT_URL, SHEET_Id]);

  // Generate serial number safely
  const generateSerialNumber = useCallback((records, machineName) => {
    if (!machineName || !machineName.trim()) {
      return "";
    }

    try {
      const currentYear = new Date().getFullYear();
      const cleanedName = machineName.toLowerCase().replace(/\s+/g, "");
      const prefix = `SRMPL-${cleanedName}/`;

      let count = 0;

      // Safely iterate through records
      if (Array.isArray(records)) {
        records.forEach((row) => {
          const serialNo = row["Serial No"] || row["Serial no"] || row["serial no"] || "";
          if (serialNo && typeof serialNo === 'string' && serialNo.startsWith(prefix)) {
            count++;
          }
        });
      }

      const suffix = String(count + 1).padStart(3, "0");
      return `${prefix}${suffix}`;
    } catch (error) {
      console.error("Error generating serial number:", error);
      return "";
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchSheetData();
    fetchMasterSheetData();
  }, [fetchSheetData, fetchMasterSheetData]);

  // Generate serial number when machine name changes
  useEffect(() => {
    if (formValues.machineName.trim() !== "" && sheetData.length > 0) {
      const newSerial = generateSerialNumber(sheetData, formValues.machineName);
      setFormValues((prev) => ({
        ...prev,
        serialNumber: newSerial,
      }));
    } else if (formValues.machineName.trim() === "") {
      setFormValues((prev) => ({
        ...prev,
        serialNumber: "",
      }));
    }
  }, [formValues.machineName, sheetData, generateSerialNumber]);

  // Safe checkbox handler for maintenanceSchedule
  const handleCheckboxChange = useCallback((e) => {
    const { id, checked } = e.target;
    setFormValues((prev) => {
      const currentSchedule = Array.isArray(prev.maintenanceSchedule)
        ? prev.maintenanceSchedule
        : [];

      const updated = checked
        ? [...currentSchedule, id]
        : currentSchedule.filter((item) => item !== id);

      return { ...prev, maintenanceSchedule: updated };
    });
  }, []);

  // Safe file upload function
  const uploadFileToDrive = async (file) => {
    return new Promise((resolve) => {
      if (!file) {
        resolve("");
        return;
      }

      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const base64Data = reader.result;
          const result = await safeFetch(SCRIPT_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              action: "uploadFile",
              base64Data: base64Data,
              fileName: file.name,
              mimeType: file.type,
              folderId: FOLDER_ID,
            }).toString(),
          });

          if (result && result.success && result.fileUrl) {
            resolve(result.fileUrl);
          } else {
            toast.error("❌ File upload failed");
            resolve("");
          }
        } catch (err) {
          console.error("Upload error:", err);
          toast.error("❌ Upload failed due to network error");
          resolve("");
        }
      };

      reader.onerror = () => {
        toast.error("❌ Failed to read file");
        resolve("");
      };

      reader.readAsDataURL(file);
    });
  };

  // Safe input handler
  const handleInputChange = useCallback((e) => {
    const { id, value } = e.target;
    setFormValues((prev) => ({ ...prev, [id]: value }));
  }, []);

  // Safe date formatter
  const formatDateToDDMMYYYY = (dateStr) => {
    if (!dateStr || dateStr === "") return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "";

      const dd = String(date.getDate()).padStart(2, "0");
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const yyyy = date.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch (e) {
      console.error("Date formatting error:", e);
      return dateStr;
    }
  };

  // Form validation
  const validateForm = () => {
    const requiredFields = {
      machineName: "Machine Name",
      department: "Department",
      purchaseDate: "Purchase Date",
      purchasePrice: "Purchase Price",
      initialMaintenanceDate: "Initial Maintenance Date"
    };

    for (const [field, label] of Object.entries(requiredFields)) {
      if (!formValues[field] || formValues[field].toString().trim() === "") {
        toast.error(`❌ ${label} is required`);
        return false;
      }
    }

    if (isNaN(Number(formValues.purchasePrice)) || Number(formValues.purchasePrice) <= 0) {
      toast.error("❌ Please enter a valid purchase price");
      return false;
    }

    return true;
  };

  // Safe form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoaderSubmit(true);

      // Upload files in parallel
      const [userManualUrl, purchaseBillUrl] = await Promise.all([
        userManualFile ? uploadFileToDrive(userManualFile) : Promise.resolve(""),
        purchaseBillFile ? uploadFileToDrive(purchaseBillFile) : Promise.resolve(""),
      ]);

      const payload = {
        action: "insert",
        sheetName: SHEET_NAME,
        "Serial No": formValues.serialNumber,
        "Machine Name": formValues.machineName,
        "Model No": formValues.model,
        Manufacturer: formValues.manufacturer,
        Department: formValues.department,
        Location: formValues.location,
        "Purchase Date": formatDateToDDMMYYYY(formValues.purchaseDate),
        "Purchase Price": formValues.purchasePrice,
        Vendor: formValues.vendor,
        "Warranty Expiration": formatDateToDDMMYYYY(formValues.warrantyExpiration),
        "Maintenance Schedule": JSON.stringify(formValues.maintenanceSchedule),
        "Initial Maintenance Date": formatDateToDDMMYYYY(formValues.initialMaintenanceDate),
        "User Manual": userManualUrl,
        "Purchase Bill": purchaseBillUrl,
        Notes: formValues.note,
        "Tag No": formValues.tagNo, // New field for column P
        "User Allot": formValues.userAllot, // New field for column Q
      };

      const result = await safeFetch(SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(payload).toString(),
      });

      if (result && result.success) {
        toast.success("✅ Machine added successfully!");

        // Reset form
        setFormValues({
          machineName: "",
          serialNumber: "",
          model: "",
          manufacturer: "",
          department: "",
          location: "",
          purchaseDate: "",
          purchasePrice: "",
          vendor: "",
          warrantyExpiration: "",
          maintenanceSchedule: [],
          initialMaintenanceDate: "",
          note: "",
          tagNo: "", // Reset new field
          userAllot: "", // Reset new field
        });

        setUserManualFile(null);
        setPurchaseBillFile(null);

        // Navigate back to machines list
        setTimeout(() => {
          navigate("/machines");
        }, 1000);
      } else {
        toast.error("❌ Failed to add machine: " + (result?.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("❌ Network error. Please try again.");
    } finally {
      setLoaderSubmit(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Link
          to="/machines"
          className="text-indigo-600 hover:text-indigo-900 mr-4 flex items-center"
        >
          <ChevronLeft size={20} />
          <span>Back to Machines</span>
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Add New Machine</h1>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <h2 className="font-medium text-lg text-gray-900 border-b pb-2">
                  Machine Information
                </h2>

                {/* Machine Name */}
                <div>
                  <label
                    htmlFor="machineName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Machine Name*
                  </label>
                  <input
                    type="text"
                    id="machineName"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    placeholder="e.g., Hydraulic Press HP-102"
                    value={formValues.machineName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {/* Serial Number - Now Editable Input Field */}
                <div>
                  <label
                    htmlFor="serialNumber"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Serial Number
                  </label>
                  <input
                    type="text"
                    id="serialNumber"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    placeholder="Auto-generated or enter manually"
                    value={formValues.serialNumber}
                    onChange={handleInputChange}
                  />
                  {/* <p className="text-xs text-gray-500 mt-1">
                    Serial number will be auto-generated when you enter machine name, but you can edit it if needed.
                  </p> */}
                </div>

                {/* Tag No. - New Input Field */}
                <div>
                  <label
                    htmlFor="tagNo"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Tag No
                  </label>
                  <input
                    type="text"
                    id="tagNo"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    placeholder="e.g., TAG-001, ASSET-2024"
                    value={formValues.tagNo}
                    onChange={handleInputChange}
                  />
                </div>

                {/* User Allot - New Input Field */}
                <div>
                  <label
                    htmlFor="userAllot"
                    className="block text-sm font-medium text-gray-700"
                  >
                    User Allot
                  </label>
                  <input
                    type="text"
                    id="userAllot"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    placeholder="e.g., John Doe, Maintenance Team"
                    value={formValues.userAllot}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Model No */}
                <div>
                  <label
                    htmlFor="model"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Model No
                  </label>
                  <input
                    type="text"
                    id="model"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    placeholder="e.g., HP-2000 Series"
                    value={formValues.model}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Manufacturer */}
                <div>
                  <label
                    htmlFor="manufacturer"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    id="manufacturer"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    value={formValues.manufacturer}
                    onChange={handleInputChange}
                    placeholder="e.g., Industrial Dynamics Ltd."
                  />
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="font-medium text-lg text-gray-900 border-b pb-2">
                  Department & Location
                </h2>

                {/* Department */}
                <div>
                  <label
                    htmlFor="department"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Department*
                  </label>
                  <select
                    id="department"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    value={formValues.department}
                    onChange={handleInputChange}
                    disabled={loaderMasterSheetData}
                    required
                  >
                    <option value="">
                      {loaderMasterSheetData ? "Loading departments..." : "Select Department"}
                    </option>
                    {departmentOptions.map((dept, index) => (
                      <option key={index} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  {loaderMasterSheetData && (
                    <p className="text-xs text-gray-500 mt-1">
                      <Loader2Icon className="inline animate-spin w-3 h-3 mr-1" />
                      Loading department options...
                    </p>
                  )}
                </div>

                {/* Location */}
                <div>
                  <label
                    htmlFor="location"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Location
                  </label>
                  <input
                    type="text"
                    id="location"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    value={formValues.location}
                    onChange={handleInputChange}
                    placeholder="e.g., Building A, Floor 2, Section 3"
                  />
                </div>

                <h2 className="font-medium text-lg text-gray-900 border-b pb-2">
                  Purchase & Maintenance Details
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="purchaseDate"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Purchase Date*
                    </label>
                    <input
                      type="date"
                      id="purchaseDate"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                      value={formValues.purchaseDate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="purchasePrice"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Purchase Price*
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">₹</span>
                      </div>
                      <input
                        type="number"
                        id="purchasePrice"
                        className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        placeholder="0.00"
                        value={formValues.purchasePrice}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="vendor"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Vendor
                  </label>
                  <input
                    type="text"
                    id="vendor"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    value={formValues.vendor}
                    onChange={handleInputChange}
                    placeholder="e.g., Industrial Suppliers Inc."
                  />
                </div>

                <div>
                  <label
                    htmlFor="warrantyExpiration"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Warranty Expiration
                  </label>
                  <input
                    type="date"
                    id="warrantyExpiration"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    value={formValues.warrantyExpiration}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maintenance Schedule
                  </label>
                  <div className="space-y-2">
                    {[
                      { id: "Daily", label: "Daily" },
                      { id: "Weekly", label: "Weekly" },
                      { id: "Monthly", label: "Monthly" },
                      { id: "Half-Yearly", label: "Half-Yearly" },
                      { id: "Quarterly", label: "Quarterly" },
                      { id: "Yearly", label: "Yearly" }
                    ].map((option) => (
                      <div key={option.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={option.id}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          checked={formValues.maintenanceSchedule.includes(option.id)}
                          onChange={handleCheckboxChange}
                        />
                        <label
                          htmlFor={option.id}
                          className="ml-2 block text-sm text-gray-700"
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="initialMaintenanceDate"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Initial Maintenance Date*
                  </label>
                  <input
                    type="date"
                    id="initialMaintenanceDate"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    value={formValues.initialMaintenanceDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Documentation Uploads */}
            <div className="mt-6 border-t border-gray-200 pt-6">
              <h2 className="font-medium text-lg text-gray-900 mb-4">
                Documentation
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    User Manual
                  </label>
                  <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-indigo-400 transition-colors">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500"
                        >
                          <span>Upload a file</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            onChange={(e) => setUserManualFile(e.target.files[0])}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {userManualFile
                          ? userManualFile.name
                          : "Image, PDF, DOC up to 10MB"}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purchase Bill
                  </label>
                  <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-indigo-400 transition-colors">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="specs-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500"
                        >
                          <span>Upload a file</span>
                          <input
                            id="specs-upload"
                            name="specs-upload"
                            type="file"
                            className="sr-only"
                            onChange={(e) => setPurchaseBillFile(e.target.files[0])}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {purchaseBillFile
                          ? purchaseBillFile.name
                          : "Image, PDF, DOC up to 10MB"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Note Section */}
            <div className="mt-6 border-t border-gray-200 pt-6">
              <h2 className="font-medium text-lg text-gray-900 mb-4">Notes</h2>
              <textarea
                rows={4}
                id="note"
                className="shadow-sm block w-full focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border border-gray-300 rounded-md p-2"
                placeholder="Add any additional notes about this machine..."
                value={formValues.note}
                onChange={handleInputChange}
              />
            </div>

            {/* Submit Button */}
            <div className="mt-8 flex justify-end space-x-3">
              <Link
                to="/machines"
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loaderSubmit}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loaderSubmit && <Loader2Icon className="animate-spin mr-2 w-4 h-4" />}
                Save Machine
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewMachine;