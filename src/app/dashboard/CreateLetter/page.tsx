'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { Select, message, Spin, Button, Input } from 'antd';
import { getTemplateDetailsForUser, fetchSharedTemplates, checkPlaceholderDetails, PlaceholderDetails } from '@/utils/api';
import axios from 'axios';
import { API_URL } from '@/app/config';
import { usePathname, useSearchParams } from 'next/navigation';
//import './editor_ozel.css';
import CkeditorOzel from './ckeditor_letter';

const { TextArea } = Input;

// Assuming these interfaces are defined in your api.ts or elsewhere
interface CustomField {
  id: string;
  name: string;
  orgName: string;
  type: string;
  initialValue: string | null;
  placeholder: string;
}

interface FormData {
  [key: string]: string;
}

interface SavedTemplate {
  id: string;
  name?: string | null;
  content?: string; // Optional
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface SavedLetterResponse {
  id: string;
  name: string;
  templateId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface SharedTemplateData {
  id: string;
  name?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatar?: string | null;
  };
}

// Placeholder extraction function
const extractPlaceholders = (text: string): string[] => {
  const regex = /#([a-zA-Z0-9-]+)#/g;
  const placeholders = new Set<string>();
  let match;
  while ((match = regex.exec(text)) !== null) {
    placeholders.add(match[1]);
  }
  return Array.from(placeholders);
};

// LetterFormPanel Component
function LetterFormPanel({
  formData,
  setFormData,
  customFields,
}: {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  customFields: CustomField[];
}) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Set initial form data when customFields change
  useEffect(() => {
    if (customFields.length > 0) {
      const initialData: FormData = {};
      customFields.forEach(field => {
        // Only set initial value if field doesn't already have a value in formData
        if (field.initialValue && !formData[field.id]) {
          initialData[field.id] = field.initialValue;
        }
      });
      
      // Only update if there are new initial values to set
      if (Object.keys(initialData).length > 0) {
        setFormData(prev => ({ ...prev, ...initialData }));
      }
    }
  }, [customFields]);

  // Function to determine input type based on field type
  const getInputType = (fieldType: string): string => {
    switch (fieldType.toLowerCase()) {
      case 'data':
        return 'date';
      case 'time':
        return 'time';
      case 'date and time':
        return 'datetime-local';
      case 'number':
      case 'currency':
      case 'weight':
      case 'depletable balance':
        return 'number';
      case 'text':
      default:
        return 'text';
    }
  };

  // Function to render appropriate input component
  const renderInputField = (field: CustomField) => {
    if (field.type.toLowerCase() === 'dropdown') {
      // Parse options from initialValue (comma-separated)
      const options = field.initialValue 
        ? field.initialValue.split(',').map(option => option.trim()).filter(option => option.length > 0)
        : [];
      
      return (
        <select
          name={field.id}
          value={formData[field.id] || ''}
          onChange={handleInputChange}
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        >
          <option value="">Select...</option>
          {options.map((option, index) => (
            <option key={index} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    const inputType = getInputType(field.type);
    
    // Get appropriate placeholder
    const getPlaceholder = () => {
      if (field.initialValue && field.type.toLowerCase() !== 'dropdown') {
        return field.initialValue;
      }
      
      switch (field.type.toLowerCase()) {
        case 'dropdown':
          return field.initialValue 
            ? `Options: ${field.initialValue}`
            : 'No dropdown options added';
        case 'data':
          return 'YYYY-MM-DD';
        case 'time':
          return 'HH:MM';
        case 'date and time':
          return 'YYYY-MM-DD HH:MM';
        case 'currency':
          return '0.00 AZN';
        case 'weight':
          return '0.00 kg';
        case 'number':
          return '0';
        case 'depletable balance':
          return '0.00';
        default:
          return `Enter value for ${field.orgName}`;
      }
    };
    
    return (
      <input
        type={inputType}
        name={field.id}
        value={formData[field.id] || ''}
        onChange={handleInputChange}
        placeholder={getPlaceholder()}
        className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        // Add step for number inputs to allow decimals
        step={['currency', 'weight', 'depletable balance'].includes(field.type.toLowerCase()) ? '0.01' : undefined}
        // Add min for certain number types
        min={['number', 'currency', 'weight', 'depletable balance'].includes(field.type.toLowerCase()) ? '0' : undefined}
      />
    );
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Letter Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-1">
        {customFields.map(field => (
          <div key={field.id} className="mb-3">
            <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-0.5">
              {field.orgName}
              {field.type && (
                <span className="text-xs text-gray-500 ml-2">({field.type})</span>
              )}
            </label>
            {renderInputField(field)}
          </div>
        ))}
      </div>
    </div>
  );
}

// LetterPreviewPanel Component
function LetterPreviewPanel({
  template,
  formData,
  onSaveLetter,
  isSaving,
  letterName,
  setLetterName,
  submissionComment,
  setSubmissionComment,
}: {
  template: SavedTemplate | null;
  formData: FormData;
  onSaveLetter: () => void;
  isSaving: boolean;
  letterName: string;
  setLetterName: React.Dispatch<React.SetStateAction<string>>;
  submissionComment: string;
  setSubmissionComment: React.Dispatch<React.SetStateAction<string>>;
}) {
    const [processedContent, setProcessedContent] = useState<string>('');

  useEffect(() => {
    if (template?.content) {
      const renderedContent = renderContentWithPlaceholders(template.content);
      setProcessedContent(renderedContent);
    }
  }, [template, formData]);

  // Replace placeholders with formData
  const renderContentWithPlaceholders = (text: string): string => {
    if (!text) return '';
    return text.replace(/#([a-zA-Z0-9-]+)#/g, (match, p1) => {
      return formData[p1] || `[${p1} is empty]`; 
    });
  };

  if (!template || !template.content) {
    return <div className="flex items-center justify-center h-full text-gray-500">Select a template for letter preview or no content available.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-700">Letter Preview</h3>
        <Button type="primary" onClick={onSaveLetter} loading={isSaving} disabled={!template || isSaving}>
          Save Letter
        </Button>
      </div>
      
      <div className="mb-4">
        <label htmlFor="letterName" className="block text-sm font-medium text-gray-700 mb-1">
          Letter name
        </label>
        <input
          id="letterName"
          type="text"
          value={letterName}
          onChange={(e) => setLetterName(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          placeholder="Enter letter name"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="submissionComment" className="block text-sm font-medium text-gray-700 mb-1">
          Submission Comment (Required)
        </label>
        <TextArea
          id="submissionComment"
          rows={3}
          value={submissionComment}
          onChange={(e) => setSubmissionComment(e.target.value)}
          className="w-full"
          placeholder="Enter your initial comment for this submission..."
          maxLength={500}
          showCount
          disabled={isSaving}
        />
        <p className="text-xs text-gray-500 mt-1">
          This comment will be visible to all reviewers and approvers.
        </p>
      </div>

      <div className="document-editor">
        
        <CkeditorOzel
          onChange={() => {}}
          initialData={processedContent}
          customFields={[]} 
          readOnly={true}
        />
      </div>



      
    </div>
  );
}

// Component to handle search params
function SearchParamsHandler({ 
  sharedTemplates, 
  selectedTemplateId, 
  setSelectedTemplateId 
}: {
  sharedTemplates: SharedTemplateData[];
  selectedTemplateId: string | null;
  setSelectedTemplateId: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const templateIdFromUrl = searchParams.get('templateId');
    if (templateIdFromUrl && sharedTemplates.length > 0 && !selectedTemplateId) {
      // Check if the template exists in the shared templates list
      const templateExists = sharedTemplates.some(template => template.id === templateIdFromUrl);
      if (templateExists) {
        console.log("Auto-selecting template from URL:", templateIdFromUrl);
        setSelectedTemplateId(templateIdFromUrl);
      } else {
        console.warn("Template ID from URL not found in shared templates:", templateIdFromUrl);
        message.warning("Selected template not found or not accessible.");
      }
    }
  }, [searchParams, sharedTemplates, selectedTemplateId, setSelectedTemplateId]);

  return null; // This component doesn't render anything
}

// Main Page Component
export default function CreateLetterPage() {
  const [sharedTemplates, setSharedTemplates] = useState<SharedTemplateData[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<SavedTemplate | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isLoadingTemplateDetails, setIsLoadingTemplateDetails] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isSavingLetter, setIsSavingLetter] = useState(false);
  const [letterName, setLetterName] = useState('');
  const [submissionComment, setSubmissionComment] = useState('');
  const pathname = usePathname();
  const isCreateLetterPage = pathname && pathname.includes('CreateLetter');

  useEffect(() => {
    const fetchSharedTemplatesData = async () => {
      setIsLoadingTemplates(true);
      setTemplateError(null);
      try {
        const sharedTpls = await fetchSharedTemplates();
        console.log("Shared templates fetched:", sharedTpls);
        setSharedTemplates(sharedTpls || []);
      } catch (err: any) {
        const msg = err.message || 'Error loading templates.';
        console.error("Template fetch error:", err);
        setTemplateError(msg);
        message.error(msg);
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    fetchSharedTemplatesData();
  }, []);

  useEffect(() => {
    if (!selectedTemplateId) {
      setSelectedTemplate(null);
      return;
    }
    const fetchDetails = async () => {
      setIsLoadingTemplateDetails(true);
      setTemplateError(null);
      try {
        const details = await getTemplateDetailsForUser(selectedTemplateId);
        console.log("Template details fetched:", details);
        setSelectedTemplate(details); // No type error now
        if (details.content) {
          const placeholders = extractPlaceholders(details.content);

          console.log("Extracted placeholders:", placeholders);
          
          // Check placeholder details from backend for each placeholder
          const fieldPromises = placeholders.map(async (placeholder) => {
            const placeholderDetails = await checkPlaceholderDetails(placeholder);
            
            if (placeholderDetails && placeholderDetails.found) {
              // Use backend data if placeholder exists
              return {
                id: placeholderDetails.name,
                orgName: placeholderDetails.orgName || placeholder,
                name: placeholderDetails.name,
                type: placeholderDetails.type || 'text',
                initialValue: placeholderDetails.initialValue || '',
                placeholder: `#${placeholder}#`
              };
            } else {
              // Use default values if placeholder doesn't exist in backend
              return {
                id: placeholder,
                orgName: placeholder,
                name: placeholder.replace(/-/g, ' ').toUpperCase(),
                type: 'text',
                initialValue: '',
                placeholder: `#${placeholder}#`
              };
            }
          });
          
          const fields = await Promise.all(fieldPromises);
          console.log("Fields with backend details:", fields);
          setCustomFields(fields);
        } else {
          setCustomFields([]);
        }
        setFormData({});
      } catch (err: any) {
        const msg = err.message || 'Error loading template details.';
        console.error("Template details fetch error:", err);
        setTemplateError(msg);
        message.error(msg);
      } finally {
        setIsLoadingTemplateDetails(false);
      }
    };
    fetchDetails();
  }, [selectedTemplateId]);

  const templateOptions = useMemo(() => {
    return sharedTemplates.map(tpl => {
      const creatorName = tpl.creator ? `${tpl.creator.firstName || ''} ${tpl.creator.lastName || ''}`.trim() : null;
      let label = tpl.name || `Unnamed Template ${tpl.id.substring(0, 6)}...`;
      if (creatorName) {
        label += ` (Shared by: ${creatorName})`;
      } else {
        label += ` (Shared)`;
      }
      return { label, value: tpl.id };
    });
  }, [sharedTemplates]);

  const handleSaveLetter = async () => {
    if (!selectedTemplate || !selectedTemplateId) {
      message.error("Select a template before saving the letter.");
      return;
    }

    if (!letterName.trim()) {
      message.warning("Please enter the name of the letter.");
      return;
    }

    if (!submissionComment.trim()) {
      message.warning("Please enter a submission comment.");
      return;
    }

    const missingFields = customFields.filter(field => !formData[field.id] || formData[field.id].trim() === '');
    if (missingFields.length > 0) {
      message.warning(`Please fill in the required fields: ${missingFields.map(f => f.name).join(', ')}`);
      return;
    }

    setIsSavingLetter(true);
    message.loading({ content: 'Saving letter...', key: 'savingLetter' });
    try {
      const letterPayload = {
        templateId: selectedTemplateId,
        formData: formData,
        name: letterName.trim(),
        comment: submissionComment.trim()
      };
      const savedLetterData = await saveLetter(letterPayload);
      message.success({ content: `Letter (ID: ${savedLetterData.id}) saved successfully!`, key: 'savingLetter', duration: 3 });
      setSelectedTemplateId(null);
      setSelectedTemplate(null);
      setFormData({});
      setLetterName('');
      setSubmissionComment('');
    } catch (error: any) {
      console.error("Error saving letter:", error);
      let errorMsg = 'An unknown error occurred while saving the letter.';
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.message) {
        errorMsg = error.message;
      }
      message.error({ content: `Error saving letter: ${errorMsg}`, key: 'savingLetter', duration: 5 });
    } finally {
      setIsSavingLetter(false);
    }
  };

  return (
    <>
    <style jsx>{`
      .min-h-screen{
        min-height:  ${isCreateLetterPage ? 'auto !important' : '100vh'};
      }
    `}</style>
    
    {/* Search Params Handler */}
    <Suspense fallback={null}>
      <SearchParamsHandler 
        sharedTemplates={sharedTemplates}
        selectedTemplateId={selectedTemplateId}
        setSelectedTemplateId={setSelectedTemplateId}
      />
    </Suspense>

    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      {/* Template Selection */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Create Letter</h2>
        <label htmlFor="templateSelect" className="block text-sm font-medium text-gray-700 mb-1">Select Base Template</label>
        <Select
          id="templateSelect"
          style={{ width: '100%' }}
          placeholder="Select template..."
          loading={isLoadingTemplates}
          value={selectedTemplateId}
          onChange={(value) => setSelectedTemplateId(value)}
          disabled={isLoadingTemplates || isLoadingTemplateDetails}
          showSearch
          optionFilterProp="label"
          options={templateOptions}
        />
        {templateError && <p className="text-red-500 text-xs mt-1">{templateError}</p>}
        {isLoadingTemplateDetails && <div className="mt-2 text-center"><Spin size="small" /> Loading template...</div>}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-template-columns lg:gap-8" style={{ gridTemplateColumns: '1fr 2fr' }}>
        {/* Form Panel */}
        <div className={`bg-white rounded-lg shadow-md p-6 transition-opacity duration-300 ${!selectedTemplateId || isLoadingTemplateDetails ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          {selectedTemplateId && !isLoadingTemplateDetails && selectedTemplate ? (
            <LetterFormPanel
              formData={formData}
              setFormData={setFormData}
              customFields={customFields}
            />
          ) : (
            <div className="text-center text-gray-500 py-10">
              {isLoadingTemplates ? 'Loading templates...' : 'Select a template from above to enter data.'}
            </div>
          )}
        </div>

        {/* Preview Panel */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <LetterPreviewPanel
            template={selectedTemplate}
            formData={formData}
            onSaveLetter={handleSaveLetter}
            isSaving={isSavingLetter}
            letterName={letterName}
            setLetterName={setLetterName}
            submissionComment={submissionComment}
            setSubmissionComment={setSubmissionComment}
          />
        </div>
      </div>
    </div>
    </>
  );
}


async function saveLetter(payload: { templateId: string; formData: FormData; name: string; comment: string }): Promise<SavedLetterResponse> {
    const response = await axios.post(`${API_URL}/letters`, payload, {
        withCredentials: true,
    });
  return response.data;
}