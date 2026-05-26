import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardContent, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { EditButton } from "@/components/shared-buttons/EditButton";
import { SaveButton } from "@/components/shared-buttons/SaveButton";
import { sectionIcons } from "@/components/hr-employees/utils";

interface EmployeeProfileTabsProps {
  sectionList: string[];
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  editMode: { [key: string]: boolean };
  setEditMode: (mode: { [key: string]: boolean }) => void;
  handleSaveSection: (section: string) => void;
  loading: boolean;
  renderSection: (section: string) => React.ReactNode;
}

export function EmployeeProfileTabs({
  sectionList,
  currentTab,
  setCurrentTab,
  editMode,
  setEditMode,
  handleSaveSection,
  loading,
  renderSection
}: EmployeeProfileTabsProps) {
  const handleCancel = (section: string) => {
    setEditMode({ ...editMode, [section]: false });
    // Note: We would need to pass a function to reset the form to original state
  };

  return (
    <Tabs value={currentTab} onValueChange={setCurrentTab} orientation="vertical" className="w-full">
      <div className="flex flex-row gap-6 w-full">
        {/* Vertical Tabs */}
        <TabsList className="flex flex-col gap-2 bg-gray-50 rounded-xl shadow-none p-2 w-48 mt-2 h-full">
          {sectionList.map(section => (
            <TabsTrigger
              key={section}
              value={section}
              className={`flex gap-2 py-2 whitespace-nowrap text-sm font-medium transition-all w-full rounded-lg ${currentTab === section ? 'bg-blue-100 text-blue-700 font-semibold shadow' : 'hover:bg-gray-100'}`}
            >
              {sectionIcons[section]}
              {section.charAt(0).toUpperCase() + section.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Content area */}
        <main className="flex-1 w-full min-w-0">
          {sectionList.map(section => (
            <TabsContent key={section} value={section}>
              <Card className="mb-6 bg-white border border-gray-200 shadow-sm w-full my-2">
                <CardHeader className="flex flex-row items-center justify-between px-4 pt-4 pb-2">
                  <div className="font-semibold flex items-center gap-2">
                    {sectionIcons[section]}
                    {section.charAt(0).toUpperCase() + section.slice(1)}
                  </div>
                  {!editMode[section] ? (
                    <EditButton 
                      isEditing={editMode[section]} 
                      onStartEdit={() => setEditMode({ ...editMode, [section]: true })} 
                    />
                  ) : (
                    <div className="flex gap-2">
                      <SaveButton 
                        onClick={() => handleSaveSection(section)} 
                        loading={loading}
                      >
                        Save
                      </SaveButton>
                      <EditButton 
                        isEditing={editMode[section]} 
                        onCancel={() => handleCancel(section)} 
                      />
                    </div>
                  )}
                </CardHeader>
                <Separator />
                <CardContent className="px-4 pb-4 pt-2">
                  <CardDescription className="mb-4 text-muted-foreground">
                    Update or review {section} details for this employee.
                  </CardDescription>
                  {loading ? (
                    <div className="flex justify-center items-center h-32">
                      <span className="animate-spin h-8 w-8 border-4 border-blue-400 border-t-transparent rounded-full"></span>
                    </div>
                  ) : (
                    renderSection(section)
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </main>
      </div>
    </Tabs>
  );
}