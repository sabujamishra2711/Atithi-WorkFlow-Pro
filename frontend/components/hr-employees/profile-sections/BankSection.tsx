import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface BankSectionProps {
  form: any;
  isEditing: boolean;
  handleNestedChange: (parent: string, field: string, value: any) => void;
}

export function BankSection({
  form,
  isEditing,
  handleNestedChange
}: BankSectionProps) {
  // Ensure bankDetails object exists with all required properties
  const bankDetails = form.bankDetails || {
    nameOnBank: "",
    accountNo: "",
    ifsc: "",
    branchAddress: ""
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="nameOnBank">Bank Name</Label>
        <Input
          id="nameOnBank"
          value={bankDetails.nameOnBank || ""}
          onChange={(e) => handleNestedChange("bankDetails", "nameOnBank", e.target.value)}
          disabled={!isEditing}
        />
      </div>
      <div>
        <Label htmlFor="accountNo">Account Number</Label>
        <Input
          id="accountNo"
          value={bankDetails.accountNo || ""}
          onChange={(e) => handleNestedChange("bankDetails", "accountNo", e.target.value)}
          disabled={!isEditing}
        />
      </div>
      <div>
        <Label htmlFor="ifsc">IFSC Code</Label>
        <Input
          id="ifsc"
          value={bankDetails.ifsc || ""}
          onChange={(e) => handleNestedChange("bankDetails", "ifsc", e.target.value)}
          disabled={!isEditing}
        />
      </div>
      <div>
        <Label htmlFor="branchAddress">Branch Address</Label>
        <Input
          id="branchAddress"
          value={bankDetails.branchAddress || ""}
          onChange={(e) => handleNestedChange("bankDetails", "branchAddress", e.target.value)}
          disabled={!isEditing}
        />
      </div>
    </div>
  );
}