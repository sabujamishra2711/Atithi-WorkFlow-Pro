import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Employee {
  _id: string;
  empId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  department?: string;
  position?: string;
  monthlySalary?: string;
  joiningDate?: string;
  status?: string;
}

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  employeeToDelete: Employee | null;
  onConfirm: () => void;
}

export function DeleteConfirmationDialog({ 
  isOpen, 
  onOpenChange, 
  employeeToDelete, 
  onConfirm 
}: DeleteConfirmationDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the employee{" "}
            <strong>
              {employeeToDelete?.firstName} {employeeToDelete?.middleName || ""} {employeeToDelete?.lastName}
            </strong>{" "}
            with ID <strong>{employeeToDelete?.empId}</strong> from the system.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700">
            Delete Employee
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}