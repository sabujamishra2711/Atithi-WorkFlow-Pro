import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Briefcase, 
  Banknote, 
  Book, 
  Users, 
  Phone, 
  Activity, 
  Globe, 
  Heart, 
  Shield, 
  Star, 
  MoreHorizontal 
} from "lucide-react";

export const sectionIcons: { [key: string]: React.ReactElement } = {
  personal: <User className="h-4 w-4 mr-1 text-blue-600" />,
  employment: <Briefcase className="h-4 w-4 mr-1 text-green-600" />,
  bank: <Banknote className="h-4 w-4 mr-1 text-yellow-600" />,
  statutory: <Shield className="h-4 w-4 mr-1 text-gray-600" />,
  education: <Book className="h-4 w-4 mr-1 text-purple-600" />,
  family: <Users className="h-4 w-4 mr-1 text-pink-600" />,
  emergency: <Phone className="h-4 w-4 mr-1 text-red-600" />,
  work: <Activity className="h-4 w-4 mr-1 text-orange-600" />,
  languages: <Globe className="h-4 w-4 mr-1 text-cyan-600" />,
  criminal: <Shield className="h-4 w-4 mr-1 text-gray-600" />,
  health: <Heart className="h-4 w-4 mr-1 text-rose-600" />,
  references: <Star className="h-4 w-4 mr-1 text-amber-600" />,
  other: <MoreHorizontal className="h-4 w-4 mr-1 text-muted-foreground" />,
};

export const getStatusBadge = (status: string) => {
  if (!status) return <Badge variant="secondary">Unknown</Badge>;
  if (status.toLowerCase() === "active") return <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>;
  if (status.toLowerCase() === "on leave") return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">On Leave</Badge>;
  if (status.toLowerCase() === "inactive") return <Badge className="bg-red-100 text-red-700 border-red-200">Inactive</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
};