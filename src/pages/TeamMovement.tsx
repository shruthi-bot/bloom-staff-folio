import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CalendarIcon, Search, Users } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

// Constants for lookup IDs
const LOOKUP_IDS = {
  SERVICE_LINE: 7,
  BASE_LOCATION: 8,
  ORGANIZATION: 17,
}

const STATUS_ACTIVE = 72

type LookupData = {
  [key: number]: Array<{
    LookUpValueID: number
    LookUpValueName: string
  }>
}

type EmployeeData = {
  EMPLOYEENO?: string
  CUSERID?: string
  EMPLOYEENAME?: string
  CURRENT_SERVICELINEID?: number
  CURRENT_BASELOCATIONID?: number
  CURRENT_ORGANIZATIONID?: number
  FROM_DATE?: string
}

type TeamMovementHistory = {
  EMPLOYEENO: string
  CUSERID: string
  EMPLOYEENAME: string
  FROM_DATE: string
  FROM_SERVICELINEID: number
  TO_SERVICELINEID: number
  FROM_BASELOCATIONID: number
  TO_BASELOCATIONID: number
  FROM_ORGANIZATIONID: number
  TO_ORGANIZATIONID: number
  BILL_START_DATE: string
}

type EditData = {
  TO_SERVICELINEID?: number
  TO_BASELOCATIONID?: number
  TO_ORGANIZATIONID?: number
  BILL_START_DATE?: string
}

const TeamMovement = () => {
  const { toast } = useToast()
  
  const [lookupData, setLookupData] = useState<LookupData>({})
  const [employeeNoQuery, setEmployeeNoQuery] = useState("")
  const [cuserIdQuery, setCuserIdQuery] = useState("")
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null)
  const [editData, setEditData] = useState<EditData>({})
  const [employeeStatus, setEmployeeStatus] = useState<number | null>(null)
  const [movementHistory, setMovementHistory] = useState<TeamMovementHistory[]>([])
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
    const searchQuery = employeeNoQuery.trim() || cuserIdQuery.trim()
    
    if (!searchQuery) {
      toast({
        title: "Error",
        description: "Please enter Employee No or CUser ID.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      // First verify employee
      const verifyResponse = await fetch(`http://127.0.0.1:8000/employee-verify/${searchQuery}`)
      if (!verifyResponse.ok) {
        throw new Error(`HTTP error! Status: ${verifyResponse.ok}`)
      }
      const verifyData = await verifyResponse.json()
      const status = verifyData.employee_status_id
      setEmployeeStatus(status)
      console.log('Fetched employeeStatus:', status)

      // Fetch team movement current details
      const responseData = await fetch(`http://127.0.0.1:8000/TeamMovement/${searchQuery}`)
      if (!responseData.ok) {
        throw new Error(`HTTP error! Status: ${responseData.status}`)
      }
      const data = await responseData.json()

      if (data.length > 0) {
        const capitalizedData = capitalizeKeys(data[0])
        setEmployeeData(capitalizedData)
        setEditData({})
        console.log('Team movement data:', capitalizedData)
      } else {
        setEmployeeData(null)
        setEditData({})
        toast({
          title: "No Data",
          description: "No team movement data found for this employee.",
          variant: "destructive"
        })
      }

      // Fetch team movement history
      const historyResponse = await fetch(`http://127.0.0.1:8000/TeamMovementHistory/${searchQuery}`)
      if (historyResponse.ok) {
        const historyData = await historyResponse.json()
        const capitalizedHistory = historyData.map((item: any) => capitalizeKeys(item))
        setMovementHistory(capitalizedHistory)
        console.log('Movement history:', capitalizedHistory)
      } else {
        setMovementHistory([])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setEmployeeData(null)
      setEmployeeStatus(null)
      setMovementHistory([])
      toast({
        title: "Error",
        description: "Failed to fetch employee data.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const capitalizeKeys = (obj: any) => {
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
    const newValue = name.endsWith('ID') ? parseInt(String(value), 10) : String(value)
    setEditData({ ...editData, [name]: newValue })
  }

  const handleDateChange = (date: Date | undefined, name: string) => {
    setEditData({ ...editData, [name]: date ? format(date, "yyyy-MM-dd") : undefined })
  }

  const handleClear = () => {
    setEmployeeNoQuery("")
    setCuserIdQuery("")
    setEmployeeData(null)
    setEditData({})
    setEmployeeStatus(null)
    setMovementHistory([])
  }

  const handleSubmit = async () => {
    if (!employeeData?.EMPLOYEENO) {
      toast({
        title: "Error",
        description: "Employee number is required.",
        variant: "destructive"
      })
      return
    }

    if (!editData.TO_SERVICELINEID || !editData.TO_BASELOCATIONID || !editData.TO_ORGANIZATIONID || !editData.BILL_START_DATE) {
      toast({
        title: "Error",
        description: "Please fill all required fields in 'To Service Line' section.",
        variant: "destructive"
      })
      return
    }

    try {
      const dataToSubmit = {
        EmployeeNo: employeeData.EMPLOYEENO,
        CUserID: employeeData.CUSERID || null,
        EmployeeName: employeeData.EMPLOYEENAME || null,
        FromServiceLineID: employeeData.CURRENT_SERVICELINEID || null,
        ToServiceLineID: editData.TO_SERVICELINEID,
        FromBaseLocationID: employeeData.CURRENT_BASELOCATIONID || null,
        ToBaseLocationID: editData.TO_BASELOCATIONID,
        FromOrganizationID: employeeData.CURRENT_ORGANIZATIONID || null,
        ToOrganizationID: editData.TO_ORGANIZATIONID,
        FromDate: employeeData.FROM_DATE || null,
        BillStartDate: editData.BILL_START_DATE,
        Entered_By: 'C53', // TODO: Set dynamically based on authenticated user
      }

      const response = await fetch('http://127.0.0.1:8000/insert_team_movement', {
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
          description: result.message || "Team movement details submitted successfully.",
        })
        // Refresh data after successful submission
        handleSearch()
      } else {
        throw new Error(`Error: ${response.status}`)
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast({
        title: "Error",
        description: "Failed to submit team movement details.",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Team Movement</h1>
      </div>

      {/* Employee Search */}
      <Card className="bg-card/80 backdrop-blur-sm shadow-soft">
        <CardHeader>
          <CardTitle className="text-primary">Employee Search</CardTitle>
          <CardDescription>Enter Employee No or CUser ID to search</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="employeeNo">Employee No</Label>
              <Input
                id="employeeNo"
                value={employeeNoQuery}
                onChange={(e) => setEmployeeNoQuery(e.target.value)}
                placeholder="Enter Employee No"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="cuserId">CUser Id</Label>
              <Input
                id="cuserId"
                value={cuserIdQuery}
                onChange={(e) => setCuserIdQuery(e.target.value)}
                placeholder="Enter CUser Id"
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleSearch} 
                disabled={isLoading}
                className="bg-gradient-primary hover:shadow-hover w-full"
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
          
          {employeeData && (
            <div>
              <Label>Employee Name</Label>
              <Input
                value={employeeData.EMPLOYEENAME || ''}
                disabled
                className="mt-1"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current and To Service Line Sections */}
      {employeeData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Service Line - All Disabled */}
          <Card className="bg-card/80 backdrop-blur-sm shadow-soft">
            <CardHeader className="bg-primary/5">
              <CardTitle className="text-primary">Current Service Line</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div>
                <Label className="text-muted-foreground">Current Service Line</Label>
                <Input 
                  value={getLookUpName(LOOKUP_IDS.SERVICE_LINE, employeeData.CURRENT_SERVICELINEID)} 
                  disabled 
                  className="mt-1" 
                />
              </div>

              <div>
                <Label className="text-muted-foreground">Current Location</Label>
                <Input 
                  value={getLookUpName(LOOKUP_IDS.BASE_LOCATION, employeeData.CURRENT_BASELOCATIONID)} 
                  disabled 
                  className="mt-1" 
                />
              </div>

              <div>
                <Label className="text-muted-foreground">Current Orgaization</Label>
                <Input 
                  value={getLookUpName(LOOKUP_IDS.ORGANIZATION, employeeData.CURRENT_ORGANIZATIONID)} 
                  disabled 
                  className="mt-1" 
                />
              </div>

              <div>
                <Label className="text-muted-foreground">From Date*</Label>
                <Input 
                  value={employeeData.FROM_DATE || ''} 
                  disabled 
                  className="mt-1" 
                />
              </div>
            </CardContent>
          </Card>

          {/* To Service Line - All Editable */}
          <Card className="bg-card/80 backdrop-blur-sm shadow-soft">
            <CardHeader className="bg-primary/5">
              <CardTitle className="text-primary">To Service Line</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div>
                <Label htmlFor="to-service-line">To Service Line *</Label>
                <Select
                  value={String(editData.TO_SERVICELINEID || '')}
                  onValueChange={(value) => handleEditChange('TO_SERVICELINEID', value)}
                >
                  <SelectTrigger className="mt-1">
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

              <div>
                <Label htmlFor="to-location">To Location *</Label>
                <Select
                  value={String(editData.TO_BASELOCATIONID || '')}
                  onValueChange={(value) => handleEditChange('TO_BASELOCATIONID', value)}
                >
                  <SelectTrigger className="mt-1">
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

              <div>
                <Label htmlFor="to-organization">To Orgaization *</Label>
                <Select
                  value={String(editData.TO_ORGANIZATIONID || '')}
                  onValueChange={(value) => handleEditChange('TO_ORGANIZATIONID', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select an Option" />
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

              <div>
                <Label>Bill Start Date*</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !editData.BILL_START_DATE && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editData.BILL_START_DATE ? format(new Date(editData.BILL_START_DATE), "MM/dd/yyyy") : <span>mm/dd/yyyy</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editData.BILL_START_DATE ? new Date(editData.BILL_START_DATE) : undefined}
                      onSelect={(date) => handleDateChange(date, 'BILL_START_DATE')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      {employeeData && (
        <div className="flex gap-2">
          <Button 
            onClick={handleSubmit}
            disabled={employeeStatus !== STATUS_ACTIVE}
            className="bg-gradient-primary hover:shadow-hover"
          >
            Save
          </Button>
          <Button 
            onClick={handleClear}
            variant="outline"
          >
            Clear
          </Button>
        </div>
      )}

      {/* Team Movement History Table */}
      {movementHistory.length > 0 && (
        <Card className="bg-card/80 backdrop-blur-sm shadow-soft">
          <CardHeader>
            <CardTitle className="text-primary">Team Movement History</CardTitle>
            <CardDescription>Previous team movements for this employee</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Emp No</TableHead>
                    <TableHead>CUser ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>From Date</TableHead>
                    <TableHead>From Service Line</TableHead>
                    <TableHead>To Service Line</TableHead>
                    <TableHead>From Location</TableHead>
                    <TableHead>To Location</TableHead>
                    <TableHead>From Organization</TableHead>
                    <TableHead>To Organization</TableHead>
                    <TableHead>Bill Start Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movementHistory.map((movement, index) => (
                    <TableRow key={index}>
                      <TableCell>{movement.EMPLOYEENO}</TableCell>
                      <TableCell>{movement.CUSERID}</TableCell>
                      <TableCell>{movement.EMPLOYEENAME}</TableCell>
                      <TableCell>{movement.FROM_DATE}</TableCell>
                      <TableCell>{getLookUpName(LOOKUP_IDS.SERVICE_LINE, movement.FROM_SERVICELINEID)}</TableCell>
                      <TableCell>{getLookUpName(LOOKUP_IDS.SERVICE_LINE, movement.TO_SERVICELINEID)}</TableCell>
                      <TableCell>{getLookUpName(LOOKUP_IDS.BASE_LOCATION, movement.FROM_BASELOCATIONID)}</TableCell>
                      <TableCell>{getLookUpName(LOOKUP_IDS.BASE_LOCATION, movement.TO_BASELOCATIONID)}</TableCell>
                      <TableCell>{getLookUpName(LOOKUP_IDS.ORGANIZATION, movement.FROM_ORGANIZATIONID)}</TableCell>
                      <TableCell>{getLookUpName(LOOKUP_IDS.ORGANIZATION, movement.TO_ORGANIZATIONID)}</TableCell>
                      <TableCell>{movement.BILL_START_DATE}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default TeamMovement
