"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit, Mail, User, Lock, Phone, Shield } from "lucide-react";
import { updateUserSchema } from "@/app/api/validation/user";

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  contact?: string | null;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

interface EditUserModalProps {
  user: User | null;
  onUserUpdated?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function EditUserModal({ user, onUserUpdated, isOpen, onClose }: EditUserModalProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [success, setSuccess] = React.useState(false);
  const [formData, setFormData] = React.useState({
    id: "",
    name: "",
    username: "",
    email: "",
    password: "",
    contact: "",
    status: "active",
  });

  // Update form data when user changes
  React.useEffect(() => {
    if (user) {
      setFormData({
        id: user.id,
        name: user.name || "",
        username: user.username || "",
        email: user.email || "",
        password: "",
        contact: user.contact || "",
        status: user.status || "active",
      });
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }
    
    // Clear success state when user starts typing
    if (success) {
      setSuccess(false);
    }
  };

  const validateForm = (): boolean => {
    try {
      updateUserSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error: unknown) {
      const newErrors: Record<string, string> = {};
      if (error && typeof error === 'object' && 'errors' in error && Array.isArray(error.errors)) {
        error.errors.forEach((err: { path: string[]; message: string }) => {
          newErrors[err.path[0]] = err.message;
        });
      }
      setErrors(newErrors);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details && Array.isArray(data.details)) {
          const newErrors: Record<string, string> = {};
          data.details.forEach((detail: { path: string[]; message: string }) => {
            newErrors[detail.path[0]] = detail.message;
          });
          setErrors(newErrors);
        } else {
          setErrors({ general: data.error || "Failed to update user" });
        }
        return;
      }

      setSuccess(true);

      // Call onUserUpdated after a short delay to show success message
      setTimeout(() => {
        onUserUpdated?.();
        onClose();
        setSuccess(false);
      }, 1500);

    } catch (error) {
      console.error('Error updating user:', error);
      setErrors({ general: "Failed to update user. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setFormData({
      id: "",
      name: "",
      username: "",
      email: "",
      password: "",
      contact: "",
      status: "active",
    });
    setErrors({});
    setSuccess(false);
  };

  if (!user) return null;

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-2xl h-full flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit User
          </SheetTitle>
          <SheetDescription>
            Update user information and permissions.
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          <Card className="shadow-lg">
            <CardHeader className="pb-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold">User Information</h3>
                <p className="text-sm text-muted-foreground">Update the details below</p>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {errors.general && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {errors.general}
                </div>
              )}

              {success && (
                <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
                  User updated successfully!
                </div>
              )}

              {/* User Information */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-foreground border-b pb-2">User Details</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Full Name *
                    </Label>
                    <Input
                      id="name"
                      placeholder="Enter full name"
                      className="h-11"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      required
                    />
                    {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Username *
                    </Label>
                    <Input
                      id="username"
                      placeholder="Enter username"
                      className="h-11"
                      value={formData.username}
                      onChange={(e) => handleInputChange("username", e.target.value)}
                      required
                    />
                    {errors.username && <p className="text-sm text-red-600">{errors.username}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    className="h-11"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                  />
                  {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact" className="text-sm font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Contact Number
                  </Label>
                  <Input
                    id="contact"
                    placeholder="Enter contact number"
                    className="h-11"
                    value={formData.contact}
                    onChange={(e) => handleInputChange("contact", e.target.value)}
                  />
                  {errors.contact && <p className="text-sm text-red-600">{errors.contact}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Status
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleInputChange("status", value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.status && <p className="text-sm text-red-600">{errors.status}</p>}
                </div>
              </div>

              {/* Security Information */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-foreground border-b pb-2">Security</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    New Password (leave blank to keep current password)
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter new password (min 6 characters)"
                    className="h-11"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                  />
                  {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1 h-11"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating User...
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Update User
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-11"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}


