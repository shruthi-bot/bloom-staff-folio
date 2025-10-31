import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CalendarIcon, UserMinus, Search, Edit } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

// Constants for lookup IDs
const LOOKUP_IDS = {
  SERVICE_LINE: 7,
  BASE_LOCATION: 8,
  EMPLOYEE_SOURCE: 13,
  ROLLOFF_REASON: 14, // Assuming ID for rolloff reason
  ROLLOFF_REMARKS: 15, // Assuming ID for rolloff remarks
  ROLLOFF: 11, // Assuming ID for rolloff yes/no
}

const STATUS_ACTIVE = 72
const STATUS_NEW = 203
const STATUS_INACTIVE = 73

type LookupData = {
  [key: number]: Array<{
    LookUpValueID: number
    LookUpValueName: string
  }>
}

type RollOffData = {
  EMPLOYEENO?: string
  EMPLOYEENAME?: string
  CUSERID?: string
  ROLLOFF?: number
  ROLLOFFDATE?: string
  ROLLOFFINTIMATIONMAIL?: string
  NWACCESSDISABLED?: string
  ODCACCESSDISABLED?: string
  EMPLOYEESOURCEID?: number
  SL_NO?: string
  SERVICELINEID?: number
  BASELOCATIONID?: number
  ROLLOFFNOTIFICATIONMAIL?: string
  ROLLOFFREASONID?: number
  ROLLOFFREMARKSID?: number
  ROLLOFFDOCPATH?: string
}

const ProjectRollOff = () => {
  const { toast } = useToast()
  
  const [lookupData, setLookupData] = useState<LookupData>({})
  const [employeeIdQuery, setEmployeeIdQuery] = useState("")
  const [cuserIdQuery, setCuserIdQuery] = useState("")
  const [employeeData, setEmployeeData] = useState<RollOffData | null>(null)
  const [editData, setEditData] = useState<RollOffData>({})
  const [employeeStatus, setEmployeeStatus] = useState<number | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch lookup data on component mount
  useEffect(() => {
    fetchLookupData()
  }, [])

  const fetchLookupData = async () => {
    if (Object.keys(lookupData).length === 0) {
      try {
        const response = await fetch('http://127.0.0.1:8000/fetch-lookup-values-no-input')
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }
        const data = await response.json()
        setLookupData(data)
        console.log('Fetched lookupData:', data)
      } catch (error) {
        console.error('Failed to fetch lookup data:', error)
        toast({
          title: "Error",
          description: "Failed to fetch lookup data from backend.",
          variant: "destructive"
        })
      }
    }
  }

  const handleSearch = async () => {
    const searchQuery = employeeIdQuery.trim() || cuserIdQuery.trim()
    
    if (!searchQuery) {
      toast({
        title: "Error",
        description: "Please enter either Employee ID or CUser ID.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      // First verify employee
      const verifyResponse = await fetch(`http://127.0.0.1:8000/employee-verify/${searchQuery}`)
      if (!verifyResponse.ok) {
        throw new Error(`HTTP error! Status: ${verifyResponse.status}`)
      }
      const verifyData = await verifyResponse.json()
      const status = verifyData.employee_status_id
      setEmployeeStatus(status)
      console.log('Fetched employeeStatus:', status)

      // Fetch roll-off details
      const responseData = await fetch(`http://127.0.0.1:8000/RollOff/${searchQuery}`)
      if (!responseData.ok) {
        throw new Error(`HTTP error! Status: ${responseData.status}`)
      }
      const data = await responseData.json()

      if (data.length > 0) {
        const capitalizedData = capitalizeKeys(data[0])
        setEmployeeData(capitalizedData)
        setEditData(capitalizedData)
        console.log('Initial employeeData:', capitalizedData)
      } else {
        setEmployeeData(null)
        setEditData({})
        toast({
          title: "No Data",
          description: "No employee data found for this ID.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setEmployeeData(null)
      setEmployeeStatus(null)
      toast({
        title: "Error",
        description: "Failed to fetch employee data.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const capitalizeKeys = (obj: any): RollOffData => {
    return Object.keys(obj).reduce((acc: any, key) => {
      const capitalizedKey = key.replace(/Id$/, 'ID').toUpperCase()
      acc[capitalizedKey] = obj[key]
      return acc
    }, {})
  }

  const getLookUpName = (lookupId: number, itemId: number | undefined) => {
    if (!itemId) return 'TBD'
    const parsedItemId = Number.isInteger(itemId) ? itemId : parseInt(String(itemId), 10)
    const value = lookupData[lookupId]?.find((item) => item.LookUpValueID === parsedItemId)?.LookUpValueName || 'TBD'
    return value
  }

  const handleEditChange = (name: string, value: string | number) => {
    if (name === 'CUSERID' && (value === '' || /^C\d{0,9}$/g.test(String(value)))) {
      setEditData({ ...editData, [name]: String(value) })
    } else if (name !== 'CUSERID') {
      const newValue: string | number = name.endsWith('ID') ? parseInt(String(value), 10) : String(value)
      setEditData({ ...editData, [name]: newValue })
    }
  }

  const handleDateChange = (date: Date | undefined, name: string) => {
    setEditData({ ...editData, [name]: date ? format(date, "yyyy-MM-dd") : undefined })
  }

  const handleSaveChanges = () => {
    setEmployeeData({ ...editData })
    setShowEditModal(false)
    toast({
      title: "Changes Saved",
      description: "Employee roll-off details updated. Click Submit to save to backend.",
    })
  }

  const handleSubmit = async () => {
    if (!editData.EMPLOYEENO) {
      toast({
        title: "Error",
        description: "Employee number is required.",
        variant: "destructive"
      })
      return
    }

    try {
      const dataToSubmit = {
        EmployeeNo: editData.EMPLOYEENO || null,
        CUserID: editData.CUSERID || null,
        EmployeeName: editData.EMPLOYEENAME || null,
        RollOff: editData.ROLLOFF || null,
        RollOffDate: editData.ROLLOFFDATE || null,
        RollOffIntimationMail: editData.ROLLOFFINTIMATIONMAIL || null,
        NWAccessDisabled: editData.NWACCESSDISABLED || null,
        ODCAccessDisabled: editData.ODCACCESSDISABLED || null,
        EmployeeSourceID: editData.EMPLOYEESOURCEID || null,
        Sl_No: editData.SL_NO || null,
        ServiceLineID: editData.SERVICELINEID || null,
        BaseLocationID: editData.BASELOCATIONID || null,
        RollOffNotificationMail: editData.ROLLOFFNOTIFICATIONMAIL || null,
        RollOffReasonID: editData.ROLLOFFREASONID || null,
        RollOffRemarksID: editData.ROLLOFFREMARKSID || null,
        RollOffDocPath: editData.ROLLOFFDOCPATH || null,
        Entered_By: 'C53', // TODO: Set dynamically based on authenticated user
      }

      const response = await fetch('http://127.0.0.1:8000/insert_rolloff_details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSubmit),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Success",
          description: result.message || "Employee roll-off details submitted successfully.",
        })
      } else {
        throw new Error(`Error: ${response.status}`)
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast({
        title: "Error",
        description: "Failed to submit roll-off details.",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UserMinus className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Project Roll Off</h1>
      </div>

      {/* Employee Search */}
      <Card className="bg-card/80 backdrop-blur-sm shadow-soft">
        <CardHeader>
          <CardTitle className="text-primary">Employee Search</CardTitle>
          <CardDescription>Please enter EMPLOYEEID or CUSER below to perform a ROLL-OFF</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="employeeId">Employee Id</Label>
              <Input
                id="employeeId"
                value={employeeIdQuery}
                onChange={(e) => {
                  setEmployeeIdQuery(e.target.value)
                  setCuserIdQuery("") // Clear the other field
                }}
                placeholder="Enter Employee ID"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="cuserId">Cuser-Id</Label>
              <Input
                id="cuserId"
                value={cuserIdQuery}
                onChange={(e) => {
                  setCuserIdQuery(e.target.value)
                  setEmployeeIdQuery("") // Clear the other field
                }}
                placeholder="Enter CUser ID"
                className="mt-2"
              />
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={isLoading}
              className="bg-gradient-primary hover:shadow-hover mt-8"
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Roll Off Details */}
      {employeeData ? (
        <Card className="bg-card/80 backdrop-blur-sm shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-primary">Roll off Details</CardTitle>
                <CardDescription>Employee roll-off information</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(true)}
                  disabled={employeeStatus !== STATUS_ACTIVE}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={employeeStatus !== STATUS_ACTIVE}
                  className="bg-gradient-primary hover:shadow-hover"
                >
                  Submit
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <Input value={employeeData.EMPLOYEENAME || 'TBD'} disabled className="mt-1" />
                </div>
                
                <div>
                  <Label className="text-muted-foreground">Roll Off</Label>
                  <Input value={getLookUpName(LOOKUP_IDS.ROLLOFF, employeeData.ROLLOFF)} disabled className="mt-1" />
                </div>

                <div>
                  <Label className="text-muted-foreground">Rolloff Date *</Label>
                  <Input value={employeeData.ROLLOFFDATE || 'TBD'} disabled className="mt-1" />
                </div>

                <div>
                  <Label className="text-muted-foreground">RollOff Intimation Mail *</Label>
                  <Input value={employeeData.ROLLOFFINTIMATIONMAIL || 'TBD'} disabled className="mt-1" />
                </div>

                <div>
                  <Label className="text-muted-foreground">NW Access Disabled</Label>
                  <Input value={employeeData.NWACCESSDISABLED || 'TBD'} disabled className="mt-1" />
                </div>

                <div>
                  <Label className="text-muted-foreground">ODC Access disabled</Label>
                  <Input value={employeeData.ODCACCESSDISABLED || 'TBD'} disabled className="mt-1" />
                </div>

                <div>
                  <Label className="text-muted-foreground">Source</Label>
                  <Input value={getLookUpName(LOOKUP_IDS.EMPLOYEE_SOURCE, employeeData.EMPLOYEESOURCEID)} disabled className="mt-1" />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Slno</Label>
                  <Input value={employeeData.SL_NO || 'TBD'} disabled className="mt-1" />
                </div>

                <div>
                  <Label className="text-muted-foreground">Service Line</Label>
                  <Input value={getLookUpName(LOOKUP_IDS.SERVICE_LINE, employeeData.SERVICELINEID)} disabled className="mt-1" />
                </div>

                <div>
                  <Label className="text-muted-foreground">Base Location</Label>
                  <Input value={getLookUpName(LOOKUP_IDS.BASE_LOCATION, employeeData.BASELOCATIONID)} disabled className="mt-1" />
                </div>

                <div>
                  <Label className="text-muted-foreground">RollOff Notification Mail *</Label>
                  <Input value={employeeData.ROLLOFFNOTIFICATIONMAIL || 'TBD'} disabled className="mt-1" />
                </div>

                <div>
                  <Label className="text-muted-foreground">RollOff Reason *</Label>
                  <Input value={getLookUpName(LOOKUP_IDS.ROLLOFF_REASON, employeeData.ROLLOFFREASONID)} disabled className="mt-1" />
                </div>

                <div>
                  <Label className="text-muted-foreground">RollOff Remarks *</Label>
                  <Input value={getLookUpName(LOOKUP_IDS.ROLLOFF_REMARKS, employeeData.ROLLOFFREMARKSID)} disabled className="mt-1" />
                </div>

                <div>
                  <Label className="text-muted-foreground">RollOffDocPath *</Label>
                  <Input value={employeeData.ROLLOFFDOCPATH || 'TBD'} disabled className="mt-1" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/80 backdrop-blur-sm shadow-soft">
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p>No data available. Please enter Employee ID or CUser ID and click Search.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee Roll Off Details</DialogTitle>
            <DialogDescription>
              Modify employee roll-off information
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* Employee Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editData.EMPLOYEENAME || ''}
                onChange={(e) => handleEditChange('EMPLOYEENAME', e.target.value)}
              />
            </div>

            {/* Roll Off */}
            <div className="space-y-2">
              <Label htmlFor="edit-rolloff">Roll Off</Label>
              <Select
                value={String(editData.ROLLOFF || '')}
                onValueChange={(value) => handleEditChange('ROLLOFF', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an Option" />
                </SelectTrigger>
                <SelectContent>
                  {lookupData[LOOKUP_IDS.ROLLOFF]?.map(({ LookUpValueID, LookUpValueName }) => (
                    <SelectItem key={LookUpValueID} value={String(LookUpValueID)}>
                      {LookUpValueName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rolloff Date */}
            <div className="space-y-2">
              <Label>Rolloff Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editData.ROLLOFFDATE && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editData.ROLLOFFDATE ? format(new Date(editData.ROLLOFFDATE), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={editData.ROLLOFFDATE ? new Date(editData.ROLLOFFDATE) : undefined}
                    onSelect={(date) => handleDateChange(date, 'ROLLOFFDATE')}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* RollOff Intimation Mail */}
            <div className="space-y-2">
              <Label htmlFor="edit-intimation-mail">RollOff Intimation Mail *</Label>
              <Input
                id="edit-intimation-mail"
                type="email"
                value={editData.ROLLOFFINTIMATIONMAIL || ''}
                onChange={(e) => handleEditChange('ROLLOFFINTIMATIONMAIL', e.target.value)}
              />
            </div>

            {/* NW Access Disabled */}
            <div className="space-y-2">
              <Label>NW Access Disabled</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editData.NWACCESSDISABLED && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editData.NWACCESSDISABLED ? format(new Date(editData.NWACCESSDISABLED), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={editData.NWACCESSDISABLED ? new Date(editData.NWACCESSDISABLED) : undefined}
                    onSelect={(date) => handleDateChange(date, 'NWACCESSDISABLED')}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* ODC Access Disabled */}
            <div className="space-y-2">
              <Label>ODC Access disabled</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editData.ODCACCESSDISABLED && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editData.ODCACCESSDISABLED ? format(new Date(editData.ODCACCESSDISABLED), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={editData.ODCACCESSDISABLED ? new Date(editData.ODCACCESSDISABLED) : undefined}
                    onSelect={(date) => handleDateChange(date, 'ODCACCESSDISABLED')}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Source */}
            <div className="space-y-2">
              <Label htmlFor="edit-source">Source</Label>
              <Select
                value={String(editData.EMPLOYEESOURCEID || '')}
                onValueChange={(value) => handleEditChange('EMPLOYEESOURCEID', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an Option" />
                </SelectTrigger>
                <SelectContent>
                  {lookupData[LOOKUP_IDS.EMPLOYEE_SOURCE]?.map(({ LookUpValueID, LookUpValueName }) => (
                    <SelectItem key={LookUpValueID} value={String(LookUpValueID)}>
                      {LookUpValueName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Slno */}
            <div className="space-y-2">
              <Label htmlFor="edit-slno">Slno</Label>
              <Input
                id="edit-slno"
                value={editData.SL_NO || ''}
                onChange={(e) => handleEditChange('SL_NO', e.target.value)}
              />
            </div>

            {/* Service Line */}
            <div className="space-y-2">
              <Label htmlFor="edit-service-line">Service Line</Label>
              <Select
                value={String(editData.SERVICELINEID || '')}
                onValueChange={(value) => handleEditChange('SERVICELINEID', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an Option" />
                </SelectTrigger>
                <SelectContent>
                  {lookupData[LOOKUP_IDS.SERVICE_LINE]?.map(({ LookUpValueID, LookUpValueName }) => (
                    <SelectItem key={LookUpValueID} value={String(LookUpValueID)}>
                      {LookUpValueName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Base Location */}
            <div className="space-y-2">
              <Label htmlFor="edit-base-location">Base Location</Label>
              <Select
                value={String(editData.BASELOCATIONID || '')}
                onValueChange={(value) => handleEditChange('BASELOCATIONID', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an Option" />
                </SelectTrigger>
                <SelectContent>
                  {lookupData[LOOKUP_IDS.BASE_LOCATION]?.map(({ LookUpValueID, LookUpValueName }) => (
                    <SelectItem key={LookUpValueID} value={String(LookUpValueID)}>
                      {LookUpValueName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* RollOff Notification Mail */}
            <div className="space-y-2">
              <Label htmlFor="edit-notification-mail">RollOff Notification Mail *</Label>
              <Input
                id="edit-notification-mail"
                type="email"
                value={editData.ROLLOFFNOTIFICATIONMAIL || ''}
                onChange={(e) => handleEditChange('ROLLOFFNOTIFICATIONMAIL', e.target.value)}
              />
            </div>

            {/* RollOff Reason */}
            <div className="space-y-2">
              <Label htmlFor="edit-rolloff-reason">RollOff Reason *</Label>
              <Select
                value={String(editData.ROLLOFFREASONID || '')}
                onValueChange={(value) => handleEditChange('ROLLOFFREASONID', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an Option" />
                </SelectTrigger>
                <SelectContent>
                  {lookupData[LOOKUP_IDS.ROLLOFF_REASON]?.map(({ LookUpValueID, LookUpValueName }) => (
                    <SelectItem key={LookUpValueID} value={String(LookUpValueID)}>
                      {LookUpValueName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* RollOff Remarks */}
            <div className="space-y-2">
              <Label htmlFor="edit-rolloff-remarks">RollOff Remarks *</Label>
              <Select
                value={String(editData.ROLLOFFREMARKSID || '')}
                onValueChange={(value) => handleEditChange('ROLLOFFREMARKSID', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an Option" />
                </SelectTrigger>
                <SelectContent>
                  {lookupData[LOOKUP_IDS.ROLLOFF_REMARKS]?.map(({ LookUpValueID, LookUpValueName }) => (
                    <SelectItem key={LookUpValueID} value={String(LookUpValueID)}>
                      {LookUpValueName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* RollOffDocPath */}
            <div className="space-y-2">
              <Label htmlFor="edit-docpath">RollOffDocPath *</Label>
              <Input
                id="edit-docpath"
                value={editData.ROLLOFFDOCPATH || ''}
                onChange={(e) => handleEditChange('ROLLOFFDOCPATH', e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveChanges} className="bg-gradient-primary hover:shadow-hover">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ProjectRollOff
