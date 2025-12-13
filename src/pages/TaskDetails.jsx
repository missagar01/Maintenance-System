import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ChevronLeft,
  Clock,
  CheckCircle,
  FileText,
  Paperclip,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";

const TaskDetails = () => {
  const { taskNo, serialNo, taskType } = useParams();
  const [allRelatedTasks, setAllRelatedTasks] = useState([]);
  const [machineName, setMachineName] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState({});
  const [taskStatuses, setTaskStatuses] = useState({});
  const [remarks, setRemarks] = useState({});
  const [imageFiles, setImageFiles] = useState({});
  const [submittingTasks, setSubmittingTasks] = useState({});
  const [activeTab, setActiveTab] = useState("details");
  const [completedTasks, setCompletedTasks] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [repairCosts, setRepairCosts] = useState({});
  const [soundStatuses, setSoundStatuses] = useState({});
  const [temperatures, setTemperatures] = useState({});
  const [taskProgress, setTaskProgress] = useState(0);

  const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbzudKkY63zbthWP_YcfyF-HnUOObG_XM9aS2JDCmTmcYLaY1OQq7ho6i085BXxu9N2E7Q/exec";
  const SHEET_ID = "15SBKzTJKzaqhjPI5yt5tKkrd3tzNuhm_Q9-iDO8n0B0";
  const FOLDER_ID = "1ZhOeYs23CGHCs6REfMGVPgMGG3PQ2jzp";

  const fetchMachineRelatedTasks = async () => {
    setLoading(true);
    try {
      const sheetName = taskNo.startsWith("TM")
        ? "Maitenance Task Assign"
        : "Repair Task Assign";

      const res = await axios.get(
        `${SCRIPT_URL}?sheetId=${SHEET_ID}&sheet=${encodeURIComponent(
          sheetName
        )}`
      );

      const columns = res.data.table.cols.map((col) => col.label);
      const rows = res.data.table.rows;

      const formattedData = rows.map((row) => {
        const obj = {};
        row.c.forEach((cell, i) => {
          obj[columns[i]] = cell?.v || "";
        });
        return obj;
      });

      const pendingTaskss = formattedData.filter(
        (item) => item["Actual Date"] === "" && item["Serial No"] === serialNo
      );

      setPendingTasks(pendingTaskss);

      const currentRow = formattedData.find(
        (row) => row["Serial No"] === serialNo
      );

      if (!currentRow) {
        console.warn("No matching row found for serialNo:", serialNo);
        setAllRelatedTasks([]);
        setCompletedTasks([]);
        return;
      }

      const currentMachineName = currentRow["Machine Name"];
      const currentSerialNo = currentRow["Serial No"];
      setMachineName(currentMachineName);

      const relatedTasks = formattedData.filter(
        (row) => row["Machine Name"] === currentMachineName && row["Serial No"] === currentSerialNo
      );

      const activeTasks = relatedTasks.filter(
        (row) => !row["Actual Date"] || row["Actual Date"].trim() === ""
      );

      const completedTasks = relatedTasks.filter(
        (row) => row["Actual Date"] && row["Actual Date"].trim() !== ""
      );

      setAllRelatedTasks(activeTasks);
      setCompletedTasks(completedTasks);

      const totalTasks = activeTasks.length + completedTasks.length;
      const precent = Math.floor((completedTasks.length * 100) / totalTasks);
      setTaskProgress(precent);

      const initialCheckedItems = {};
      const initialTaskStatuses = {};
      const initialRemarks = {};

      activeTasks.forEach((task) => {
        const taskNo = task["Task No"];
        initialCheckedItems[taskNo] = false;
        initialTaskStatuses[taskNo] = task["Task Status"] || "";
        initialRemarks[taskNo] = task["Remarks"] || "";
      });

      setCheckedItems(initialCheckedItems);
      setTaskStatuses(initialTaskStatuses);
      setRemarks(initialRemarks);
      setImageFiles({});
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachineRelatedTasks();
  }, [taskNo, serialNo]);

  const handleCheckboxChange = (taskNo) => {
    setCheckedItems((prev) => ({
      ...prev,
      [taskNo]: !prev[taskNo],
    }));

    if (checkedItems[taskNo]) {
      setTaskStatuses((prev) => {
        const newStatuses = { ...prev };
        delete newStatuses[taskNo];
        return newStatuses;
      });
      setRemarks((prev) => {
        const newRemarks = { ...prev };
        delete newRemarks[taskNo];
        return newRemarks;
      });
      setImageFiles((prev) => {
        const newFiles = { ...prev };
        delete newFiles[taskNo];
        return newFiles;
      });
    }
  };

  const handleStatusChange = (taskNo, value) => {
    setTaskStatuses((prev) => ({
      ...prev,
      [taskNo]: value,
    }));
  };

  const handleRemarksChange = (taskNo, value) => {
    setRemarks((prev) => ({
      ...prev,
      [taskNo]: value,
    }));
  };

  const handleImageUpload = (taskNo, file) => {
    setImageFiles((prev) => ({
      ...prev,
      [taskNo]: file,
    }));
  };

  const handleRepairCostChange = (taskNo, value) => {
    setRepairCosts((prev) => ({
      ...prev,
      [taskNo]: value,
    }));
  };

  const handleSoundStatusChange = (taskNo, value) => {
    setSoundStatuses((prev) => ({
      ...prev,
      [taskNo]: value,
    }));
  };

  const handleTemperatureChange = (taskNo, value) => {
    setTemperatures((prev) => ({
      ...prev,
      [taskNo]: value,
    }));
  };

  const uploadFileToDrive = async (file) => {
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        const base64Data = reader.result;

        try {
          const res = await fetch(SCRIPT_URL, {
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

          const data = await res.json();

          if (data.success && data.fileUrl) {
            resolve(data.fileUrl);
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
        reject("❌ Failed to read file");
      };

      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (taskNo) => {
    setSubmittingTasks((prev) => ({ ...prev, [taskNo]: true }));

    try {
      const task = allRelatedTasks.find((t) => t["Task No"] === taskNo);
      if (!task) {
        toast.error("Task not found");
        return;
      }

      let imgRes = "";
      let fileName = "";
      let fileType = "";
      if (imageFiles[taskNo]) {
        imgRes = await uploadFileToDrive(imageFiles[taskNo]);
        fileName = imageFiles[taskNo].name;
        fileType = fileName.split(".").pop().toLowerCase();
      }

      const payload =
        taskType === "Maintence"
          ? {
            sheetId: SHEET_ID,
            sheetName: taskNo.startsWith("TM")
              ? "Maitenance Task Assign"
              : "Repair Task Assign",
            action: "update",
            taskNo: taskNo,
            "Task Status": taskStatuses[taskNo],
            Remarks: remarks[taskNo] || "",
            "Maintenace Cost": repairCosts[taskNo] || "",
            "Sound Status": soundStatuses[taskNo] || "",
            "Temperature Status": temperatures[taskNo] || "",
            ...(imgRes && {
              "Image Link": imgRes,
              "File Name": fileName,
              "File Type": fileType,
            }),
          }
          : {
            sheetId: SHEET_ID,
            sheetName: taskNo.startsWith("TM")
              ? "Maitenance Task Assign"
              : "Repair Task Assign",
            action: "update",
            taskNo: taskNo,
            "Task Status": taskStatuses[taskNo],
            Remarks: remarks[taskNo] || "",
            "Repair Cost": repairCosts[taskNo] || "",
            "Sound Status": soundStatuses[taskNo] || "",
            "Temperature Status": temperatures[taskNo] || "",
            ...(imgRes && {
              "Image Link": imgRes,
              "File Name": fileName,
              "File Type": fileType,
            }),
          };

      if (taskStatuses[taskNo] === "Yes") {
        payload["Actual Date"] = new Date().toISOString().split("T")[0];
      }

      const response = await axios.post(SCRIPT_URL, payload, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (response.data.success) {
        toast.success("Task updated successfully");
        fetchMachineRelatedTasks();

        setCheckedItems((prev) => {
          const newChecked = { ...prev };
          delete newChecked[taskNo];
          return newChecked;
        });
        setTaskStatuses((prev) => {
          const newStatuses = { ...prev };
          delete newStatuses[taskNo];
          return newStatuses;
        });
        setRemarks((prev) => {
          const newRemarks = { ...prev };
          delete newRemarks[taskNo];
          return newRemarks;
        });
        setImageFiles((prev) => {
          const newFiles = { ...prev };
          delete newFiles[taskNo];
          return newFiles;
        });
        setRepairCosts((prev) => {
          const newCosts = { ...prev };
          delete newCosts[taskNo];
          return newCosts;
        });
        setSoundStatuses((prev) => {
          const newSounds = { ...prev };
          delete newSounds[taskNo];
          return newSounds;
        });
        setTemperatures((prev) => {
          const newTemps = { ...prev };
          delete newTemps[taskNo];
          return newTemps;
        });
      } else {
        toast.error(response.data.error || "Failed to update task");
      }
    } catch (error) {
      console.error("Error submitting task:", error);
      toast.error(error.response?.data?.error || "Error updating task");
    } finally {
      setSubmittingTasks((prev) => {
        const newState = { ...prev };
        delete newState[taskNo];
        return newState;
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <Link
            to="/tasks"
            className="text-indigo-600 hover:text-indigo-900 flex items-center text-sm sm:text-base"
          >
            <ChevronLeft size={20} />
            <span>Back to Tasks</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex-1 text-center sm:text-left">
            {taskType} - {machineName}
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 sm:p-6 border-b">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
              <div className="text-center lg:text-left">
                <h2 className="text-lg sm:text-xl font-semibold">
                  {machineName}{" "}
                  <span className="text-blue-600">({serialNo})</span>
                </h2>
                <p className="text-gray-500 text-sm sm:text-base">
                  Task Type <span className="text-blue-600">({taskType})</span>
                </p>
              </div>

              <div className="w-full lg:w-1/2">
                <h3 className="text-sm font-medium text-gray-500 mb-2 text-center lg:text-left">
                  Completion Progress
                </h3>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${taskProgress}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 text-center lg:text-left">
                  {taskProgress}% Complete
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto -mb-px">
              <button
                className={`flex-shrink-0 py-4 px-4 sm:px-6 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === "details"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                onClick={() => setActiveTab("details")}
              >
                <FileText size={16} className="inline mr-2" />
                Description
              </button>
              <button
                className={`flex-shrink-0 py-4 px-4 sm:px-6 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === "checklist"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                onClick={() => setActiveTab("checklist")}
              >
                <CheckCircle size={16} className="inline mr-2" />
                Checklist
              </button>
              <button
                className={`flex-shrink-0 py-4 px-4 sm:px-6 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === "history"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                onClick={() => setActiveTab("history")}
              >
                <Clock size={16} className="inline mr-2" />
                History
              </button>
              <button
                className={`flex-shrink-0 py-4 px-4 sm:px-6 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === "documents"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                onClick={() => setActiveTab("documents")}
              >
                <Paperclip size={16} className="inline mr-2" />
                Documents
              </button>
            </nav>
          </div>

          {loading ? (
            <div className="flex justify-center py-8 flex-col items-center text-gray-600 text-sm">
              <div className="w-6 h-6 border-4 border-blue-500 border-dashed rounded-full animate-spin mb-2"></div>
              Loading tasks...
            </div>
          ) : (
            <div className="p-2 sm:p-4">
              {/* Details Tab - Column View */}
              {activeTab === "details" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto p-2">
                  {pendingTasks.map((pendingTask, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow duration-300"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <h3 className="text-sm font-semibold text-gray-800">
                            Task No:{" "}
                            <span className="text-blue-600">
                              {pendingTask["Task No"]}
                            </span>
                          </h3>
                        </div>

                        <div className="text-xs text-gray-600">
                          <div className="flex justify-between mb-1">
                            <span>Date:</span>
                            <span className="text-blue-600">
                              {new Date(
                                pendingTask["Task Start Date"]
                              ).toLocaleDateString("en-IN", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>

                          <div className="flex justify-between mb-1">
                            <span>Sound Test:</span>
                            <span className={pendingTask["Need Sound Test"] === "Yes" ? "text-green-600" : "text-gray-600"}>
                              {pendingTask["Need Sound Test"] === "Yes" ? "Required" : "Not Required"}
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span>Temperature:</span>
                            <span className={pendingTask["Temperature"] === "Yes" ? "text-green-600" : "text-gray-600"}>
                              {pendingTask["Temperature"] === "Yes" ? "Required" : "Not Required"}
                            </span>
                          </div>
                        </div>

                        <div className="border-t pt-2">
                          <p className="text-xs text-gray-600 leading-relaxed">
                            {pendingTask["Description"]}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Checklist Tab - EXACTLY LIKE BEFORE */}
              {activeTab === "checklist" && (
                <div className="overflow-x-auto" style={{ maxHeight: "400px", overflowY: "auto" }}>
                  <div>
                    <table className="min-w-full border border-gray-300 text-sm">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="border px-2 py-1"></th>
                          <th className="border px-2 py-1 text-blue-700">
                            Task No
                          </th>
                          <th className="border px-2 py-1 text-blue-700">
                            Department
                          </th>
                          <th className="border px-2 py-1 text-blue-700">
                            Task Status
                          </th>
                          <th className="border px-2 py-1 text-blue-700">
                            Image
                          </th>
                          <th className="border px-2 py-1 text-blue-700">
                            Remarks
                          </th>

                          <th className="border px-2 py-1 text-blue-700">
                            Sound Of Machine
                          </th>
                          <th className="border px-2 py-1 text-blue-700">
                            Temperature
                          </th>
                          <th className="border px-2 py-1 text-blue-700">
                            {taskType === "Maintence"
                              ? "Maintenace Cost"
                              : "Repair Cost"}
                          </th>
                          <th className="border px-2 py-1 text-blue-700">
                            Submit
                          </th>
                        </tr>
                      </thead>

                      <tbody className="bg-white divide-y divide-gray-200">
                        {allRelatedTasks.map((task) => {
                          const taskNo = task["Task No"];
                          const isChecked = checkedItems[taskNo] || false;
                          const taskStatus = taskStatuses[taskNo] || "";
                          const canSubmit =
                            isChecked &&
                            (taskStatus === "Yes" || taskStatus === "No");
                          const isDone = !!task["Actual Date"];

                          return (
                            <tr
                              key={taskNo}
                              className={`${isDone
                                ? "bg-green-50 border-green-200 text-gray-500 line-through"
                                : "bg-white border-gray-200 text-gray-900"
                                }`}
                            >
                              <td className="border px-2 py-1 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleCheckboxChange(taskNo)}
                                  disabled={isDone}
                                  className="h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                              </td>
                              <td className="border px-2 py-1 text-center">
                                {taskNo}
                              </td>
                              <td className="border px-2 py-1 text-center">
                                {task["Department"]}
                              </td>

                              <td className="border px-2 py-1 text-center">
                                <select
                                  value={taskStatus}
                                  onChange={(e) =>
                                    handleStatusChange(taskNo, e.target.value)
                                  }
                                  disabled={!isChecked || isDone}
                                  className="border rounded px-2 py-1 w-full"
                                >
                                  <option value="">Select</option>
                                  <option value="Yes">Yes</option>
                                  <option value="No">No</option>
                                </select>
                              </td>

                              <td className="border px-2 py-1 text-center">
                                <label
                                  className={`cursor-pointer ${!isChecked || isDone
                                    ? "text-gray-400"
                                    : "text-blue-600 hover:underline"
                                    } ${task["Require Attachment"] === "Yes" &&
                                    "text-red-600"
                                    }`}
                                >
                                  Upload
                                  <input
                                    type="file"
                                    className="hidden"
                                    disabled={!isChecked || isDone}
                                    onChange={(e) =>
                                      handleImageUpload(taskNo, e.target.files[0])
                                    }
                                  />
                                  {imageFiles[taskNo] && (
                                    <span className="ml-1 text-xs">
                                      ({imageFiles[taskNo].name})
                                    </span>
                                  )}
                                </label>
                              </td>

                              <td className="border px-2 py-1 text-center">
                                <input
                                  type="text"
                                  value={remarks[taskNo] || ""}
                                  onChange={(e) =>
                                    handleRemarksChange(taskNo, e.target.value)
                                  }
                                  disabled={!isChecked || isDone}
                                  placeholder="Enter remarks"
                                  className="outline-none border px-1 py-1 rounded-md w-full"
                                />
                              </td>

                              <td className="border px-2 py-1 text-center">
                                <select
                                  value={soundStatuses[taskNo] || ""}
                                  onChange={(e) =>
                                    handleSoundStatusChange(
                                      taskNo,
                                      e.target.value
                                    )
                                  }
                                  disabled={!isChecked || isDone}
                                  className="border rounded px-2 py-1 w-full"
                                >
                                  <option value="">Select</option>
                                  <option value="Good">Good</option>
                                  <option value="Bad">Bad</option>
                                  <option value="Need Repair">Need Repair</option>
                                  <option value="Ok">Ok</option>
                                </select>
                              </td>

                              <td className="border px-2 py-1 text-center">
                                <input
                                  type="number"
                                  value={temperatures[taskNo] || ""}
                                  onChange={(e) =>
                                    handleTemperatureChange(
                                      taskNo,
                                      e.target.value
                                    )
                                  }
                                  disabled={!isChecked || isDone}
                                  placeholder="Temperature"
                                  className="outline-none border px-1 py-1 rounded-md w-full"
                                />
                              </td>

                              <td className="border px-2 py-1 text-center">
                                <input
                                  type="number"
                                  value={repairCosts[taskNo] || ""}
                                  onChange={(e) =>
                                    handleRepairCostChange(taskNo, e.target.value)
                                  }
                                  disabled={!isChecked || isDone}
                                  placeholder={
                                    taskType === "Maintence"
                                      ? "Maintenace Cost"
                                      : "Repair Cost"
                                  }
                                  className="outline-none border px-1 py-1 rounded-md w-full"
                                />
                              </td>

                              <td className="border px-2 py-1 text-center">
                                <button
                                  className={`px-2 py-1 rounded ${canSubmit &&
                                    (task["Require Attachment"] !== "Yes" ||
                                      imageFiles[taskNo])
                                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    }`}
                                  disabled={
                                    !canSubmit ||
                                    isDone ||
                                    submittingTasks[taskNo] ||
                                    (task["Require Attachment"] === "Yes" &&
                                      !imageFiles[taskNo])
                                  }
                                  onClick={() => handleSubmit(taskNo)}
                                >
                                  {submittingTasks[taskNo]
                                    ? "Submitting..."
                                    : "Submit"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* History Tab */}
              {activeTab === "history" && (
                <div className="max-h-[400px] overflow-y-auto p-2">
                  <div className="relative">
                    <div className="absolute top-0 bottom-0 left-3 sm:left-4 w-0.5 bg-gray-200"></div>

                    <div className="space-y-4">
                      {[...completedTasks].reverse().map((task) => (
                        <div key={task["Task No"]} className="relative pl-10 sm:pl-12">
                          <div className="absolute left-0 top-1.5 h-6 w-6 sm:h-7 sm:w-7 rounded-full border-2 border-indigo-500 bg-white flex items-center justify-center">
                            <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-indigo-500"></div>
                          </div>
                          <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                              <div className="font-medium text-sm sm:text-base">
                                {task["Task Type"]} completed{" "}
                                <span className="text-blue-600">
                                  ({task["Task No"]})
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                Completed by:{" "}
                                <span className="text-blue-600">
                                  ({task["Doer Name"]})
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-4 mt-2 text-xs">
                              <div className="text-green-600 font-medium">
                                Start: {new Date(task["Task Start Date"]).toLocaleDateString()}
                              </div>
                              <div className="text-red-600 font-medium">
                                Completed: {new Date(task["Actual Date"]).toLocaleDateString()}
                              </div>
                            </div>

                            {task["Remarks"] && (
                              <div className="text-xs bg-gray-50 rounded p-2 mt-2">
                                <strong>Remarks:</strong> {task["Remarks"]}
                              </div>
                            )}
                            <div className="text-xs bg-gray-50 rounded p-2 mt-1">
                              <strong>Description:</strong> {task["Description"]}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Documents Tab - Mobile Responsive */}
              {activeTab === "documents" && (
                <div className="max-h-[400px] overflow-y-auto">
                  {/* Desktop Table View */}
                  <div className="hidden lg:block">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Task No
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Document Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Uploaded By
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {[...completedTasks].reverse().map((task) => {
                          const fileName = task["File Name"] || "Document";
                          const fileType = task["File Type"]?.toUpperCase();

                          return (
                            <tr
                              key={task["Task No"]}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-indigo-600">
                                {task["Task No"]}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-indigo-600">
                                {fileName.length > 10 ? `${fileName.slice(0, 10)}...` : fileName}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                {fileType}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                {task["Doer Name"]}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                {new Date(
                                  task["Task Start Date"]
                                ).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                                {task["Image Link"] ? (
                                  <a
                                    href={task["Image Link"]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 hover:text-indigo-900 flex items-center justify-end gap-1"
                                  >
                                    <Download size={16} />
                                    Download
                                  </a>
                                ) : (
                                  <span className="text-gray-400 text-xs">No file</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="lg:hidden space-y-3 p-2">
                    {[...completedTasks].reverse().map((task) => {
                      const fileName = task["File Name"] || "Document";
                      const fileType = task["File Type"]?.toUpperCase();

                      return (
                        <div
                          key={task["Task No"]}
                          className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="space-y-3">
                            {/* Header */}
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="font-semibold text-indigo-600 text-sm">
                                  {task["Task No"]}
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">
                                  Uploaded by: {task["Doer Name"]}
                                </p>
                              </div>
                              {task["Image Link"] && (
                                <a
                                  href={task["Image Link"]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1 text-xs"
                                >
                                  <Download size={14} />
                                  Download
                                </a>
                              )}
                            </div>

                            {/* Document Info */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="font-medium text-gray-500">Document:</span>
                                <p className="text-gray-800 truncate">{fileName}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-500">Type:</span>
                                <p className="text-gray-800">{fileType}</p>
                              </div>
                              <div className="col-span-2">
                                <span className="font-medium text-gray-500">Date:</span>
                                <p className="text-gray-800">
                                  {new Date(task["Task Start Date"]).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            {/* No File State */}
                            {!task["Image Link"] && (
                              <div className="text-center py-2">
                                <span className="text-gray-400 text-xs">No document available</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {completedTasks.filter((task) => task["Image Link"]).length === 0 && (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No documents attached to this task.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetails;