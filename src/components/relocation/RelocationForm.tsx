import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

export interface RelocationEquipmentItem {
  id: string;
  makeModel: string;
  serialNumber: string;
  equipmentId: string;
  networkPrint: boolean;
  scan: boolean;
  notes: string;
}

export interface RelocationFormData {
  // Customer Information
  date: string;
  companyName: string;
  submittedBy: string;
  submittedByTitle: string;
  requestedDate: string;
  
  // Bill To
  billToAddress: string;
  billToCityStZip: string;
  billToPhone: string;
  billToEmail: string;
  
  // Current Location (Left Column)
  currentCompanyName: string;
  currentAddress: string;
  currentCity: string;
  currentState: string;
  currentZip: string;
  currentStairs: boolean;
  currentElevator: boolean;
  currentLoadingDock: boolean;
  currentSpecialInstructions: string;
  
  // Current Location (Right Column)
  currentContact: string;
  currentDepartment: string;
  currentSuite: string;
  currentPhone: string;
  currentEmail: string;
  
  // Destination (Left Column)
  destCompanyName: string;
  destAddress: string;
  destCity: string;
  destState: string;
  destZip: string;
  destStairs: boolean;
  destElevator: boolean;
  destLoadingDock: boolean;
  destSpecialInstructions: string;
  
  // Destination (Right Column)
  destContact: string;
  destDepartment: string;
  destSuite: string;
  destPhone: string;
  destEmail: string;
  
  // Equipment (up to 20 items)
  equipmentItems: RelocationEquipmentItem[];
}

export const getDefaultRelocationFormData = (): RelocationFormData => ({
  date: format(new Date(), 'yyyy-MM-dd'),
  companyName: '',
  submittedBy: '',
  submittedByTitle: '',
  requestedDate: '',
  billToAddress: '',
  billToCityStZip: '',
  billToPhone: '',
  billToEmail: '',
  currentCompanyName: '',
  currentAddress: '',
  currentCity: '',
  currentState: '',
  currentZip: '',
  currentStairs: false,
  currentElevator: false,
  currentLoadingDock: false,
  currentSpecialInstructions: '',
  currentContact: '',
  currentDepartment: '',
  currentSuite: '',
  currentPhone: '',
  currentEmail: '',
  destCompanyName: '',
  destAddress: '',
  destCity: '',
  destState: '',
  destZip: '',
  destStairs: false,
  destElevator: false,
  destLoadingDock: false,
  destSpecialInstructions: '',
  destContact: '',
  destDepartment: '',
  destSuite: '',
  destPhone: '',
  destEmail: '',
  equipmentItems: [],
});

interface RelocationFormProps {
  formData: RelocationFormData;
  onChange: (data: RelocationFormData) => void;
}

const RelocationForm: React.FC<RelocationFormProps> = ({ formData, onChange }) => {
  const updateField = <K extends keyof RelocationFormData>(field: K, value: RelocationFormData[K]) => {
    onChange({ ...formData, [field]: value });
  };

  const addEquipmentItem = () => {
    if (formData.equipmentItems.length >= 20) return;
    const newItem: RelocationEquipmentItem = {
      id: crypto.randomUUID(),
      makeModel: '',
      serialNumber: '',
      equipmentId: '',
      networkPrint: false,
      scan: false,
      notes: '',
    };
    updateField('equipmentItems', [...formData.equipmentItems, newItem]);
  };

  const updateEquipmentItem = (id: string, field: keyof RelocationEquipmentItem, value: string | boolean) => {
    const updated = formData.equipmentItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    updateField('equipmentItems', updated);
  };

  const removeEquipmentItem = (id: string) => {
    updateField('equipmentItems', formData.equipmentItems.filter(item => item.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => updateField('date', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="requestedDate">Requested Date of Relocation</Label>
                  <Input
                    id="requestedDate"
                    type="date"
                    value={formData.requestedDate}
                    onChange={(e) => updateField('requestedDate', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="submittedBy">Submitted By</Label>
                  <Input
                    id="submittedBy"
                    value={formData.submittedBy}
                    onChange={(e) => updateField('submittedBy', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="submittedByTitle">Title</Label>
                  <Input
                    id="submittedByTitle"
                    value={formData.submittedByTitle}
                    onChange={(e) => updateField('submittedByTitle', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Bill To */}
            <div className="space-y-4">
              <div className="text-sm font-semibold text-muted-foreground mb-2">Bill To</div>
              <div>
                <Label htmlFor="billToAddress">Address</Label>
                <Input
                  id="billToAddress"
                  value={formData.billToAddress}
                  onChange={(e) => updateField('billToAddress', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="billToCityStZip">City, ST. Zip</Label>
                <Input
                  id="billToCityStZip"
                  value={formData.billToCityStZip}
                  onChange={(e) => updateField('billToCityStZip', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="billToPhone">Phone</Label>
                  <Input
                    id="billToPhone"
                    value={formData.billToPhone}
                    onChange={(e) => updateField('billToPhone', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="billToEmail">Email</Label>
                  <Input
                    id="billToEmail"
                    type="email"
                    value={formData.billToEmail}
                    onChange={(e) => updateField('billToEmail', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Location */}
      <Card>
        <CardHeader>
          <CardTitle>Current Location</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="currentCompanyName">Company Name</Label>
                <Input
                  id="currentCompanyName"
                  value={formData.currentCompanyName}
                  onChange={(e) => updateField('currentCompanyName', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="currentAddress">Address</Label>
                <Input
                  id="currentAddress"
                  value={formData.currentAddress}
                  onChange={(e) => updateField('currentAddress', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="currentCity">City</Label>
                  <Input
                    id="currentCity"
                    value={formData.currentCity}
                    onChange={(e) => updateField('currentCity', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="currentState">State</Label>
                  <Input
                    id="currentState"
                    value={formData.currentState}
                    onChange={(e) => updateField('currentState', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="currentZip">Zip</Label>
                  <Input
                    id="currentZip"
                    value={formData.currentZip}
                    onChange={(e) => updateField('currentZip', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="currentStairs"
                    checked={formData.currentStairs}
                    onCheckedChange={(c) => updateField('currentStairs', !!c)}
                  />
                  <Label htmlFor="currentStairs" className="text-sm">Stairs?</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="currentElevator"
                    checked={formData.currentElevator}
                    onCheckedChange={(c) => updateField('currentElevator', !!c)}
                  />
                  <Label htmlFor="currentElevator" className="text-sm">Elevator?</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="currentLoadingDock"
                    checked={formData.currentLoadingDock}
                    onCheckedChange={(c) => updateField('currentLoadingDock', !!c)}
                  />
                  <Label htmlFor="currentLoadingDock" className="text-sm">Loading Dock?</Label>
                </div>
              </div>
              <div>
                <Label htmlFor="currentSpecialInstructions">Special Instructions</Label>
                <Textarea
                  id="currentSpecialInstructions"
                  value={formData.currentSpecialInstructions}
                  onChange={(e) => updateField('currentSpecialInstructions', e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="currentContact">Contact</Label>
                <Input
                  id="currentContact"
                  value={formData.currentContact}
                  onChange={(e) => updateField('currentContact', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="currentDepartment">Department</Label>
                <Input
                  id="currentDepartment"
                  value={formData.currentDepartment}
                  onChange={(e) => updateField('currentDepartment', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="currentSuite">Suite</Label>
                <Input
                  id="currentSuite"
                  value={formData.currentSuite}
                  onChange={(e) => updateField('currentSuite', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="currentPhone">Phone #</Label>
                <Input
                  id="currentPhone"
                  value={formData.currentPhone}
                  onChange={(e) => updateField('currentPhone', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="currentEmail">Email</Label>
                <Input
                  id="currentEmail"
                  type="email"
                  value={formData.currentEmail}
                  onChange={(e) => updateField('currentEmail', e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Destination */}
      <Card>
        <CardHeader>
          <CardTitle>Destination</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="destCompanyName">Company Name</Label>
                <Input
                  id="destCompanyName"
                  value={formData.destCompanyName}
                  onChange={(e) => updateField('destCompanyName', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="destAddress">Address</Label>
                <Input
                  id="destAddress"
                  value={formData.destAddress}
                  onChange={(e) => updateField('destAddress', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="destCity">City</Label>
                  <Input
                    id="destCity"
                    value={formData.destCity}
                    onChange={(e) => updateField('destCity', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="destState">State</Label>
                  <Input
                    id="destState"
                    value={formData.destState}
                    onChange={(e) => updateField('destState', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="destZip">Zip</Label>
                  <Input
                    id="destZip"
                    value={formData.destZip}
                    onChange={(e) => updateField('destZip', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="destStairs"
                    checked={formData.destStairs}
                    onCheckedChange={(c) => updateField('destStairs', !!c)}
                  />
                  <Label htmlFor="destStairs" className="text-sm">Stairs?</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="destElevator"
                    checked={formData.destElevator}
                    onCheckedChange={(c) => updateField('destElevator', !!c)}
                  />
                  <Label htmlFor="destElevator" className="text-sm">Elevator?</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="destLoadingDock"
                    checked={formData.destLoadingDock}
                    onCheckedChange={(c) => updateField('destLoadingDock', !!c)}
                  />
                  <Label htmlFor="destLoadingDock" className="text-sm">Loading Dock?</Label>
                </div>
              </div>
              <div>
                <Label htmlFor="destSpecialInstructions">Special Instructions</Label>
                <Textarea
                  id="destSpecialInstructions"
                  value={formData.destSpecialInstructions}
                  onChange={(e) => updateField('destSpecialInstructions', e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="destContact">Contact</Label>
                <Input
                  id="destContact"
                  value={formData.destContact}
                  onChange={(e) => updateField('destContact', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="destDepartment">Department</Label>
                <Input
                  id="destDepartment"
                  value={formData.destDepartment}
                  onChange={(e) => updateField('destDepartment', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="destSuite">Suite</Label>
                <Input
                  id="destSuite"
                  value={formData.destSuite}
                  onChange={(e) => updateField('destSuite', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="destPhone">Phone #</Label>
                <Input
                  id="destPhone"
                  value={formData.destPhone}
                  onChange={(e) => updateField('destPhone', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="destEmail">Email</Label>
                <Input
                  id="destEmail"
                  type="email"
                  value={formData.destEmail}
                  onChange={(e) => updateField('destEmail', e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Equipment</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addEquipmentItem}
            disabled={formData.equipmentItems.length >= 20}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Equipment
          </Button>
        </CardHeader>
        <CardContent>
          {formData.equipmentItems.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No equipment added. Click "Add Equipment" to add items (up to 20).
            </p>
          ) : (
            <div className="space-y-4">
              {/* Header Row */}
              <div className="grid grid-cols-[1fr_1fr_1fr_80px_80px_1fr_40px] gap-2 text-xs font-semibold text-muted-foreground pb-2 border-b">
                <div>Make/Model #</div>
                <div>Serial #</div>
                <div>ID #</div>
                <div className="text-center">Network Print?</div>
                <div className="text-center">Scan?</div>
                <div>Notes</div>
                <div></div>
              </div>
              
              {/* Equipment Rows */}
              {formData.equipmentItems.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_1fr_1fr_80px_80px_1fr_40px] gap-2 items-center">
                  <Input
                    value={item.makeModel}
                    onChange={(e) => updateEquipmentItem(item.id, 'makeModel', e.target.value)}
                    placeholder="Make/Model"
                    className="text-sm"
                  />
                  <Input
                    value={item.serialNumber}
                    onChange={(e) => updateEquipmentItem(item.id, 'serialNumber', e.target.value)}
                    placeholder="Serial #"
                    className="text-sm"
                  />
                  <Input
                    value={item.equipmentId}
                    onChange={(e) => updateEquipmentItem(item.id, 'equipmentId', e.target.value)}
                    placeholder="ID #"
                    className="text-sm"
                  />
                  <div className="flex justify-center">
                    <Checkbox
                      checked={item.networkPrint}
                      onCheckedChange={(c) => updateEquipmentItem(item.id, 'networkPrint', !!c)}
                    />
                  </div>
                  <div className="flex justify-center">
                    <Checkbox
                      checked={item.scan}
                      onCheckedChange={(c) => updateEquipmentItem(item.id, 'scan', !!c)}
                    />
                  </div>
                  <Input
                    value={item.notes}
                    onChange={(e) => updateEquipmentItem(item.id, 'notes', e.target.value)}
                    placeholder="Notes"
                    className="text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEquipmentItem(item.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RelocationForm;
