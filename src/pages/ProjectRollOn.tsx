import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CalendarIcon, UserPlus, Search, Edit } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

// Constants for lookup IDs
const LOOKUP_IDS = {
  SERVICE_LINE: 7,
  BASE_LOCATION: 8,
  ORGANIZATION: 17,
  GENDER: 16,
  PRODUCTION_LINE: 18,
  EMPLOYER: 6,
  EMPLOYEE_SOURCE: 13,
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

type EmployeeData = {
  EMPLOYEENO?: string
  EMPLOYEENAME?: string
  GENDERID?: number
  ROLLONDATE?: string
  EMPLOYEESOURCEID?: number
  SL_NO?: string
  ROLLONDOC_PATH?: string
  ODCACCESSENABLEDDT?: string
  NWACCESSENABLEDDT?: string
  CUSERID?: string
  TCSSMARTCARDNO?: string
  ROLLOFF?: string
  EMPLOYERID?: number
  SERVICELINEID?: number
  BASELOCATIONID?: number
  ORGANIZATIONID?: number
  PRODUCTIONLINEID?: number
}

const ProjectRollOn = () => {
  const { toast } = useToast()
  
  const [lookupData, setLookupData] = useState<LookupData>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null)
  const [editData, setEditData] = useState<EmployeeData>({})
  const [employeeStatus, setEmployeeStatus] = useState<number | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch lookup data on component mount
  useEffect(() => {
    fetchLookupData()
  }, [])

  const fetchLookupData = async () => {
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

  const handleSearchKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      await handleSearch()
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter an Employee No.",
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

      // Fetch roll-on details
      const responseData = await fetch(`http://127.0.0.1:8000/RollOn/${searchQuery}`)
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
          description: "No employee data found for this Employee No.",
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

  const capitalizeKeys = (obj: any): EmployeeData => {
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
      description: "Employee details updated. Click Submit to save to backend.",
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
        GenderID: editData.GENDERID || null,
        Sl_No: editData.SL_NO || null,
        RollOnDocPath: editData.ROLLONDOC_PATH || null,
        TcsCardNo: editData.TCSSMARTCARDNO || null,
        ServiceLineID: editData.SERVICELINEID || null,
        BaseLocationID: editData.BASELOCATIONID || null,
        EmployeeSourceID: editData.EMPLOYEESOURCEID || null,
        NWAccessEnabledDt: editData.NWACCESSENABLEDDT || null,
        ODCAccessEnabledDt: editData.ODCACCESSENABLEDDT || null,
        OrganizationID: editData.ORGANIZATIONID || null,
        ProductionLineID: editData.PRODUCTIONLINEID || null,
        EmployerID: editData.EMPLOYERID || null,
        RollOnDate: editData.ROLLONDATE || null,
        Entered_By: 'C53', // TODO: Set dynamically based on authenticated user
      }

      const response = await fetch('http://127.0.0.1:8000/insert_rollon_details', {
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
          description: result.message || "Employee roll-on details submitted successfully.",
        })
      } else {
        throw new Error(`Error: ${response.status}`)
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast({
        title: "Error",
        description: "Failed to submit roll-on details.",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UserPlus className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Project Roll On</h1>
      </div>

      {/* Employee Search */}
      <Card className="bg-card/80 backdrop-blur-sm shadow-soft">
        <CardHeader>
          <CardTitle className="text-primary">Employee Search</CardTitle>
          <CardDescription>Enter Employee No and press Enter to search</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="employeeNo">Employee No</Label>
              <Input
                id="employeeNo"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                placeholder="Enter Employee No and press Enter"
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

      {/* Roll On Details */}
      {employeeData ? (
        <Card className="bg-card/80 backdrop-blur-sm shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-primary">Roll On Details</CardTitle>
                <CardDescription>Employee roll-on information</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(true)}
                  disabled={employeeStatus !== STATUS_NEW}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={employeeStatus !== STATUS_NEW}
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
                  <Label className="text-muted-foreground">Name *</Label>
                  <Input value={employeeData.EMPLOYEENAME || 'TBD'} disabled className="mt-1" />
                </div>
                
                <div>
                  <Label className="text-muted-foreground">Gender *</Label>
                  <Input value={getLookUpName(LOOKUP_IDS.GENDER, employeeData.GENDERID)} disabled className="mt-1" />
                </div>

                <div>
                  <Label className="text-muted-foreground">Rollon Date *</Label>
                  <Input value={employeeData.ROLLONDATE || 'TBD'} disabled className="mt-1" />
                </div>

                <div>
                  <Label className="text-muted-foreground">Source *</Label>
                  <Input value={getLookUpName(LOOKUP_IDS.EMPLOYEE_SOURCE, employeeData.EMPLOYEESOURCEID)} disabled className="mt-1" />
                </div>

                <div>
                  <Label className="text-muted-foreground">Slno</Label>
                  <Input value={employeeData.SL_NO || 'TBD'} disabled className="mt-1" />
                </div>

                <div>
                  <Label className="text-muted-foreground">RollOnDocPath</Label>
                  <Input value={employeeData.ROLLONDOC_PATH || 'TBD'} disabled className="mt-1" />
                </div>

                <div>
                  <Label className="text-muted-foreground">ODC Access enabled</Label>
                  <Input value={employeeData.ODCACCESSENABLEDDT || 'TBD'} disabled className="mt-1" />
                </div>

                <div>
                  <Label className="text-muted-foreground">NW access enabled</Label>
                  <Input value={employeeData.NWACCESSENABLEDDT || 'TBD'} disabled className="mt-1" />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Cuser-Id</Label>
                  <Input value={employeeData.CUSERID || 'TBD'} disabled className="mt-1" />
                </div>

                <div>
                  <Label className="text-muted-foreground">TCS card No *</Label>
                  <Input value={employeeData.TCSSMARTCARDNO || 'TBD'} disabled className="mt-1" />
                </div>

                <div>
                  <Label className="text-muted-foreground">Roll Off</Label>
                  <Input value={employeeData.ROLLOFF || 'TBD'} disabled className="mt-1" />
                </div>

                <div>
                  <Label className="text-muted-foreground">Employer *</Label>
                  <Input value={getLookUpName(LOOKUP_IDS.EMPLOYER, employeeData.EMPLOYERID)} disabled className="mt-1" />
                </div>

                <div>
                  <Label className="text-muted-foreground">Service Line *</Label>
                  <Input value={getLookUpName(LOOKUP_IDS.SERVICE_LINE, employeeData.SERVICELINEID)} disabled className="mt-1" />
                </div>

                <div>
                  <Label className="text-muted-foreground">Base Location *</Label>
                  <Input value={getLookUpName(LOOKUP_IDS.BASE_LOCATION, employeeData.BASELOCATIONID)} disabled className="mt-1" />
                </div>

                <div>
                  <Label className="text-muted-foreground">Organisation *</Label>
                  <Input value={getLookUpName(LOOKUP_IDS.ORGANIZATION, employeeData.ORGANIZATIONID)} disabled className="mt-1" />
                </div>

                <div>
                  <Label className="text-muted-foreground">Projection Line *</Label>
                  <Input value={getLookUpName(LOOKUP_IDS.PRODUCTION_LINE, employeeData.PRODUCTIONLINEID)} disabled className="mt-1" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/80 backdrop-blur-sm shadow-soft">
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p>No data available. Please enter Employee No and press Enter.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee Roll On Details</DialogTitle>
            <DialogDescription>
              Modify employee roll-on information
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* Employee Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Employee Name</Label>
              <Input
                id="edit-name"
                value={editData.EMPLOYEENAME || ''}
                onChange={(e) => handleEditChange('EMPLOYEENAME', e.target.value)}
              />
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label htmlFor="edit-gender">Gender</Label>
              <Select
                value={String(editData.GENDERID || '')}
                onValueChange={(value) => handleEditChange('GENDERID', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Gender" />
                </SelectTrigger>
                <SelectContent>
                  {lookupData[LOOKUP_IDS.GENDER]?.map(({ LookUpValueID, LookUpValueName }) => (
                    <SelectItem key={LookUpValueID} value={String(LookUpValueID)}>
                      {LookUpValueName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Roll On Date */}
            <div className="space-y-2">
              <Label>Roll On Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editData.ROLLONDATE && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editData.ROLLONDATE ? format(new Date(editData.ROLLONDATE), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={editData.ROLLONDATE ? new Date(editData.ROLLONDATE) : undefined}
                    onSelect={(date) => handleDateChange(date, 'ROLLONDATE')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Employee Source */}
            <div className="space-y-2">
              <Label htmlFor="edit-source">Employee Source</Label>
              <Select
                value={String(editData.EMPLOYEESOURCEID || '')}
                onValueChange={(value) => handleEditChange('EMPLOYEESOURCEID', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Source" />
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

            {/* CUser ID */}
            <div className="space-y-2">
              <Label htmlFor="edit-cuser">CUser ID</Label>
              <Input
                id="edit-cuser"
                value={editData.CUSERID || ''}
                onChange={(e) => handleEditChange('CUSERID', e.target.value)}
                placeholder="C followed by up to 9 digits"
              />
            </div>

            {/* TCS Card No */}
            <div className="space-y-2">
              <Label htmlFor="edit-tcs-card">TCS Card No</Label>
              <Input
                id="edit-tcs-card"
                value={editData.TCSSMARTCARDNO || ''}
                onChange={(e) => handleEditChange('TCSSMARTCARDNO', e.target.value)}
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
                  <SelectValue placeholder="Select Service Line" />
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
                  <SelectValue placeholder="Select Base Location" />
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

            {/* Organization */}
            <div className="space-y-2">
              <Label htmlFor="edit-org">Organization</Label>
              <Select
                value={String(editData.ORGANIZATIONID || '')}
                onValueChange={(value) => handleEditChange('ORGANIZATIONID', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Organization" />
                </SelectTrigger>
                <SelectContent>
                  {lookupData[LOOKUP_IDS.ORGANIZATION]?.map(({ LookUpValueID, LookUpValueName }) => (
                    <SelectItem key={LookUpValueID} value={String(LookUpValueID)}>
                      {LookUpValueName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Production Line */}
            <div className="space-y-2">
              <Label htmlFor="edit-prod-line">Production Line</Label>
              <Select
                value={String(editData.PRODUCTIONLINEID || '')}
                onValueChange={(value) => handleEditChange('PRODUCTIONLINEID', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Production Line" />
                </SelectTrigger>
                <SelectContent>
                  {lookupData[LOOKUP_IDS.PRODUCTION_LINE]?.map(({ LookUpValueID, LookUpValueName }) => (
                    <SelectItem key={LookUpValueID} value={String(LookUpValueID)}>
                      {LookUpValueName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employer */}
            <div className="space-y-2">
              <Label htmlFor="edit-employer">Employer</Label>
              <Select
                value={String(editData.EMPLOYERID || '')}
                onValueChange={(value) => handleEditChange('EMPLOYERID', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Employer" />
                </SelectTrigger>
                <SelectContent>
                  {lookupData[LOOKUP_IDS.EMPLOYER]?.map(({ LookUpValueID, LookUpValueName }) => (
                    <SelectItem key={LookUpValueID} value={String(LookUpValueID)}>
                      {LookUpValueName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SL No */}
            <div className="space-y-2">
              <Label htmlFor="edit-slno">Sl No</Label>
              <Input
                id="edit-slno"
                value={editData.SL_NO || ''}
                onChange={(e) => handleEditChange('SL_NO', e.target.value)}
              />
            </div>

            {/* Roll On Doc Path */}
            <div className="space-y-2">
              <Label htmlFor="edit-doc-path">RollOn Doc Path</Label>
              <Input
                id="edit-doc-path"
                value={editData.ROLLONDOC_PATH || ''}
                onChange={(e) => handleEditChange('ROLLONDOC_PATH', e.target.value)}
              />
            </div>

            {/* ODC Access Enabled */}
            <div className="space-y-2">
              <Label>ODC Access Enabled</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editData.ODCACCESSENABLEDDT && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editData.ODCACCESSENABLEDDT ? format(new Date(editData.ODCACCESSENABLEDDT), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={editData.ODCACCESSENABLEDDT ? new Date(editData.ODCACCESSENABLEDDT) : undefined}
                    onSelect={(date) => handleDateChange(date, 'ODCACCESSENABLEDDT')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* NW Access Enabled */}
            <div className="space-y-2">
              <Label>NW Access Enabled</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editData.NWACCESSENABLEDDT && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editData.NWACCESSENABLEDDT ? format(new Date(editData.NWACCESSENABLEDDT), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={editData.NWACCESSENABLEDDT ? new Date(editData.NWACCESSENABLEDDT) : undefined}
                    onSelect={(date) => handleDateChange(date, 'NWACCESSENABLEDDT')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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

export default ProjectRollOn