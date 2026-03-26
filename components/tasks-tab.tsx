"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Search, Package, Clock, LogIn, LogOut, Loader2 } from "lucide-react"
import { AddTaskForm } from "./add-task-form"

export function TasksTab() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All Status")
  const [typeFilter, setTypeFilter] = useState("All Types")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [clockingId, setClockingId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchTasks()
  }, [])

  async function fetchTasks() {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("vnms_staff_tasks")
        .select("*")
        .order("task_date", { ascending: false })

      if (error) throw error

      setTasks(data || [])
    } catch (error: any) {
      console.error("Error fetching tasks:", error)
      toast({
        title: "Error",
        description: "Failed to fetch tasks. Please ensure the tasks table exists.",
        variant: "destructive",
      })
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  async function clockIn(taskId: string) {
    setClockingId(taskId)
    const { error } = await (supabase.from("vnms_staff_tasks") as any).update({ clock_in_at: new Date().toISOString() }).eq("id", taskId)
    if (error) { toast({ title: "Clock-in failed", description: error.message, variant: "destructive" }) }
    else { toast({ title: "Clocked In", description: "Attendance recorded." }); fetchTasks() }
    setClockingId(null)
  }

  async function clockOut(taskId: string) {
    setClockingId(taskId)
    const { error } = await (supabase.from("vnms_staff_tasks") as any).update({ clock_out_at: new Date().toISOString(), status: "Completed" }).eq("id", taskId)
    if (error) { toast({ title: "Clock-out failed", description: error.message, variant: "destructive" }) }
    else { toast({ title: "Clocked Out", description: "Task marked complete." }); fetchTasks() }
    setClockingId(null)
  }

  // Get unique task types for filter
  const taskTypes = ["All Types", ...Array.from(new Set(tasks.map((task) => task.task_type)))]
  const statusOptions = ["All Status", "Planned", "In Progress", "Completed"]

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.task_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.batch_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.assigned_to?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "All Status" || task.status === statusFilter
    const matchesType = typeFilter === "All Types" || task.task_type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  // Calculate summary metrics
  const totalTasks = tasks.length
  const totalCost = tasks.reduce((sum, task) => sum + (task.total_cost || 0), 0)
  const completedTasks = tasks.filter((task) => task.status === "Completed").length
  const averageCost = totalTasks > 0 ? totalCost / totalTasks : 0

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Completed":
        return "default"
      case "In Progress":
        return "secondary"
      case "Planned":
        return "outline"
      default:
        return "outline"
    }
  }

  return (
    <div className="modern-page space-y-8">
      {/* Modern Header */}
      <div className="modern-header">
        <h1 className="modern-title">Task Management</h1>
        <p className="modern-subtitle">Track nursery operations and maintenance tasks</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-blue-600">{totalTasks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-orange-600">Ksh {totalCost.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-orange-600">{completedTasks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">Average Cost</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-orange-600">Ksh {averageCost.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Modern Filters and Add Button */}
      <div className="modern-filters">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-base"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="flex-1 sm:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="flex-1 sm:w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {taskTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="modern-button bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-lg sm:max-w-xl p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
              </DialogHeader>
              <AddTaskForm
                onSuccess={() => {
                  setIsAddDialogOpen(false)
                  fetchTasks()
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Modern Tasks Table */}
      <Card className="modern-card">
        <CardHeader className="p-6">
          <CardTitle className="text-2xl font-bold text-foreground">Task List</CardTitle>
          <p className="text-muted-foreground mt-2">Manage and track all nursery tasks</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {tasks.length === 0 ? "No tasks found. Add your first task!" : "No tasks match your filters."}
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Task Details</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="min-w-[120px]">Cost & Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Assigned</TableHead>
                  <TableHead className="text-xs">Attendance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => (
                  <TableRow key={task.id} className="hover:bg-muted/50">
                    <TableCell className="min-w-[200px]">
                      <div className="space-y-1">
                        <div className="font-medium">{task.task_name}</div>
                        <div className="flex flex-wrap gap-2 text-sm">
                          <Badge variant="secondary" className="text-xs">{task.task_type}</Badge>
                          {task.batch_sku && (
                            <Badge variant="outline" className="font-mono text-xs">
                              {task.batch_sku}
                            </Badge>
                          )}
                        </div>
                        <div className="md:hidden text-sm text-muted-foreground">
                          {new Date(task.task_date).toLocaleDateString()}
                        </div>
                        {task.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-[180px]">
                            {task.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-sm">
                        {new Date(task.task_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <div className="space-y-2">
                        <div className="font-medium text-primary">
                          Ksh {task.total_cost?.toLocaleString() || 0}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Labor: Ksh {task.labor_cost?.toLocaleString() || 0}</div>
                          <div>Materials: Ksh {task.consumables_cost?.toLocaleString() || 0}</div>
                          {task.labor_hours && (
                            <div>Hours: {task.labor_hours}h</div>
                          )}
                        </div>
                        <Badge variant={getStatusBadgeVariant(task.status)} className="text-xs">
                          {task.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="text-sm">{task.assigned_to || "-"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {!task.clock_in_at ? (
                          <Button size="sm" variant="outline" className="text-xs h-7 border-green-300 text-green-700 hover:bg-green-50" onClick={() => clockIn(task.id)} disabled={clockingId === task.id}>
                            {clockingId === task.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogIn className="h-3 w-3 mr-1" />}Clock In
                          </Button>
                        ) : !task.clock_out_at ? (
                          <div className="space-y-1">
                            <div className="text-xs text-green-600 font-medium">In: {new Date(task.clock_in_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</div>
                            <Button size="sm" variant="outline" className="text-xs h-7 border-red-300 text-red-700 hover:bg-red-50 w-full" onClick={() => clockOut(task.id)} disabled={clockingId === task.id}>
                              {clockingId === task.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3 mr-1" />}Clock Out
                            </Button>
                          </div>
                        ) : (
                          <div className="text-xs space-y-0.5">
                            <div className="text-green-600">In: {new Date(task.clock_in_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</div>
                            <div className="text-red-600">Out: {new Date(task.clock_out_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}