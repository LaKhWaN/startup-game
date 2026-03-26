import { useState, useEffect } from 'react'
import { User, CheckCircle2, CircleDashed, Megaphone, Code, Phone, Plus } from 'lucide-react'

type Role = 'dev' | 'marketing' | 'sales'
type Employee = { id: string; name: string; role: Role; assignedTo: string | null }
type TaskNode = { id: string; title: string; progress: number; roleRequired: Role; status: 'todo' | 'active' | 'done' }

const ROLE_COLORS = {
  dev: '#38bdf8',
  marketing: '#f472b6',
  sales: '#eab308'
}

const ROLE_ICONS = {
  dev: Code,
  marketing: Megaphone,
  sales: Phone
}

const RANDOM_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack']
const RANDOM_TASKS = [
  { title: 'Fix Login Bug', role: 'dev' },
  { title: 'Build Landing Page', role: 'dev' },
  { title: 'Setup Database', role: 'dev' },
  { title: 'Write API Tests', role: 'dev' },
  { title: 'Run FB Ads', role: 'marketing' },
  { title: 'Write Blog Post', role: 'marketing' },
  { title: 'SEO Optimization', role: 'marketing' },
  { title: 'Call Enterprise Lead', role: 'sales' },
  { title: 'Send Cold Emails', role: 'sales' },
  { title: 'Pitch Meeting', role: 'sales' }
]

export default function PrototypeNodeV3({ onBack }: { onBack: () => void }) {
  const [employees, setEmployees] = useState<Employee[]>([
    { id: '1', name: 'Alice', role: 'dev', assignedTo: null },
    { id: '2', name: 'Bob', role: 'marketing', assignedTo: null }
  ])

  const [tasks, setTasks] = useState<TaskNode[]>([
    { id: 't1', title: 'Fix Login Bug', roleRequired: 'dev', progress: 0, status: 'todo' },
    { id: 't2', title: 'Run FB Ads', roleRequired: 'marketing', progress: 0, status: 'todo' }
  ])

  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // Mouse Tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (connectingFrom) setMousePos({ x: e.clientX, y: e.clientY })
    }
    const handleMouseUp = () => setConnectingFrom(null)

    if (connectingFrom) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [connectingFrom])

  // Progress Loop
  useEffect(() => {
    const id = setInterval(() => {
      setTasks(prev => prev.map(t => {
        if (t.status === 'done') return t
        const workers = employees.filter(e => e.assignedTo === t.id)
        if (workers.length > 0) {
          const newProg = Math.min(100, t.progress + workers.length * 4)
          if (newProg >= 100) {
            // Task is completed
            setEmployees(emps => emps.map(emp => emp.assignedTo === t.id ? { ...emp, assignedTo: null } : emp))
            return { ...t, progress: 100, status: 'done' }
          }
          return { ...t, progress: newProg, status: 'active' }
        }
        return { ...t, status: t.progress > 0 ? 'active' : 'todo' }
      }))
    }, 1000)
    return () => clearInterval(id)
  }, [employees])

  const handlePointerDownEmp = (e: React.PointerEvent, id: string) => {
    e.stopPropagation()
    setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, assignedTo: null } : emp))
    setConnectingFrom(id)
    setMousePos({ x: e.clientX, y: e.clientY })
  }

  const handlePointerUpTask = (e: React.PointerEvent, taskId: string, roleRequired: string) => {
    e.stopPropagation()
    if (!connectingFrom) return

    const emp = employees.find(e => e.id === connectingFrom)
    if (emp && emp.role === roleRequired) {
      setEmployees(prev => prev.map(e => e.id === connectingFrom ? { ...e, assignedTo: taskId } : e))
    } else {
      alert(`Role mismatch! A ${emp?.role} cannot perform a ${roleRequired} task.`)
    }
    setConnectingFrom(null)
  }

  const spawnEmployee = (role: Role) => {
    setEmployees(prev => [...prev, {
      id: Math.random().toString(),
      name: RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)],
      role,
      assignedTo: null
    }])
  }

  const spawnTask = () => {
    const rt = RANDOM_TASKS[Math.floor(Math.random() * RANDOM_TASKS.length)]
    setTasks(prev => [...prev, {
      id: Math.random().toString(),
      title: rt.title,
      roleRequired: rt.role as Role,
      progress: 0,
      status: 'todo'
    }])
  }

  const todoTasks = tasks.filter(t => t.status === 'todo')
  const activeTasks = tasks.filter(t => t.status === 'active')
  const doneTasks = tasks.filter(t => t.status === 'done')
  const visibleTasks = tasks.filter(t => t.status !== 'done')

  // Layout Generators
  const getEmpPos = (index: number) => {
    const col = Math.floor(index / 6)
    const row = index % 6
    return { x: 120 + col * 120, y: 150 + row * 120 }
  }

  const getTaskPos = (index: number) => {
    const col = Math.floor(index / 6)
    const row = index % 6
    return { x: 550 + col * 200, y: 150 + row * 120 }
  }

  const activeEmpInfoIndex = employees.findIndex(e => e.id === connectingFrom)
  const activeEmpInfoPos = activeEmpInfoIndex !== -1 ? getEmpPos(activeEmpInfoIndex) : { x: 0, y: 0 }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#020617', color: '#e2e8f0', position: 'relative', overflow: 'hidden', fontFamily: "'Inter', sans-serif", display: 'flex' }}>
      
      {/* Sidebar Controls */}
      <div style={{ width: 300, background: '#0f172a', borderRight: '1px solid #334155', padding: '1.5rem', display: 'flex', flexDirection: 'column', zIndex: 20, boxShadow: '10px 0 30px rgba(0,0,0,0.5)' }}>
        <button className="back-button" style={{ position: 'relative', top: 0, left: 0, marginBottom: '2rem', width: '100%' }} onClick={onBack}>&larr; Back to Hub</button>
        
        <h3 style={{ marginTop: 0, color: '#f8fafc' }}>Company Actions</h3>
        
        <button onClick={() => spawnEmployee('dev')} style={{ background: '#1e293b', border: `1px solid ${ROLE_COLORS.dev}`, color: '#f8fafc', padding: '10px', borderRadius: 8, marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={16} color={ROLE_COLORS.dev} /> Hire Developer
        </button>
        <button onClick={() => spawnEmployee('marketing')} style={{ background: '#1e293b', border: `1px solid ${ROLE_COLORS.marketing}`, color: '#f8fafc', padding: '10px', borderRadius: 8, marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={16} color={ROLE_COLORS.marketing} /> Hire Marketer
        </button>
        <button onClick={() => spawnEmployee('sales')} style={{ background: '#1e293b', border: `1px solid ${ROLE_COLORS.sales}`, color: '#f8fafc', padding: '10px', borderRadius: 8, marginBottom: '2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={16} color={ROLE_COLORS.sales} /> Hire Sales
        </button>

        <button onClick={spawnTask} style={{ background: '#10b981', border: 'none', color: '#020617', fontWeight: 'bold', padding: '12px', borderRadius: 8, marginBottom: '2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Plus size={18} /> Spawn Random Task
        </button>

        <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc' }}>Task Board</h3>
        
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: 12, fontWeight: 'bold', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' }}>To Do ({todoTasks.length})</div>
            {todoTasks.map(t => (
               <div key={t.id} style={{ fontSize: 13, background: '#1e293b', padding: '6px 10px', borderRadius: 4, marginBottom: 4, borderLeft: `3px solid ${ROLE_COLORS[t.roleRequired]}` }}>{t.title}</div>
            ))}
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: 12, fontWeight: 'bold', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' }}>In Progress ({activeTasks.length})</div>
            {activeTasks.map(t => (
               <div key={t.id} style={{ fontSize: 13, background: '#1e293b', padding: '6px 10px', borderRadius: 4, marginBottom: 4, borderLeft: `3px solid ${ROLE_COLORS[t.roleRequired]}` }}>
                 {t.title} <span style={{ color: '#38bdf8', float: 'right' }}>{t.progress}%</span>
               </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 'bold', color: '#10b981', marginBottom: 8, textTransform: 'uppercase' }}>Completed ({doneTasks.length})</div>
            {doneTasks.map(t => (
               <div key={t.id} style={{ fontSize: 13, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '6px 10px', borderRadius: 4, marginBottom: 4, borderLeft: `3px solid #10b981`, textDecoration: 'line-through' }}>{t.title}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
          <style>{`@keyframes flow { to { stroke-dashoffset: -20; } }`}</style>
          
          {/* Active Line Being Dragged */}
          {connectingFrom && activeEmpInfoIndex !== -1 && (
            <path 
              d={`M ${activeEmpInfoPos.x + 50} ${activeEmpInfoPos.y} C ${activeEmpInfoPos.x + 150} ${activeEmpInfoPos.y}, ${mousePos.x - 300 - 100} ${mousePos.y}, ${mousePos.x - 300} ${mousePos.y}`}
              fill="none" stroke="#94a3b8" strokeWidth="3" strokeDasharray="5 5"
            />
          )}

          {/* Existing Assignment Lines */}
          {employees.map((emp, empIndex) => {
            if (!emp.assignedTo) return null
            const taskIndex = visibleTasks.findIndex(t => t.id === emp.assignedTo)
            if (taskIndex === -1) return null
            
            const p1 = getEmpPos(empIndex)
            const p2 = getTaskPos(taskIndex)

            return (
              <path 
                key={emp.id}
                d={`M ${p1.x + 50} ${p1.y} C ${p1.x + 150} ${p1.y}, ${p2.x - 150} ${p2.y}, ${p2.x - 80} ${p2.y}`}
                fill="none" stroke={ROLE_COLORS[emp.role]} strokeWidth="4" strokeDasharray="10 10"
                style={{ animation: 'flow 1s linear infinite' }}
              />
            )
          })}
        </svg>

        {/* Employees */}
        {employees.map((emp, index) => {
          const Icon = ROLE_ICONS[emp.role]
          const pos = getEmpPos(index)
          return (
            <div 
              key={emp.id}
              onPointerDown={(e) => handlePointerDownEmp(e, emp.id)}
              style={{
                position: 'absolute', left: pos.x, top: pos.y, width: 80, height: 80,
                transform: 'translate(-50%, -50%)',
                background: '#1e293b', border: `2px solid ${ROLE_COLORS[emp.role]}`, borderRadius: '50%',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'grab', zIndex: 10,
                boxShadow: emp.assignedTo ? 'none' : `0 0 20px ${ROLE_COLORS[emp.role]}66`,
                transition: 'all 0.3s ease'
              }}
            >
              <Icon color={ROLE_COLORS[emp.role]} size={20} />
              <span style={{ fontSize: 10, marginTop: 4 }}>{emp.name}</span>
            </div>
          )
        })}

        {/* Task Nodes */}
        {visibleTasks.map((task, index) => {
          const isDone = task.progress >= 100
          const pos = getTaskPos(index)
          return (
            <div 
              key={task.id}
              onPointerUp={(e) => handlePointerUpTask(e, task.id, task.roleRequired)}
              style={{
                position: 'absolute', left: pos.x, top: pos.y, width: 160, height: 80,
                transform: 'translate(-50%, -50%)',
                background: '#0f172a', border: `2px solid ${isDone ? '#10b981' : '#475569'}`, borderRadius: 8,
                display: 'flex', flexDirection: 'column', padding: '10px 15px', justifyContent: 'center',
                cursor: connectingFrom ? 'crosshair' : 'default', zIndex: 10,
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 'bold', color: isDone ? '#10b981' : '#f8fafc' }}>{task.title}</span>
                <CircleDashed size={16} color="#475569" />
              </div>
              
              <div style={{ width: '100%', height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${task.progress}%`, height: '100%', background: ROLE_COLORS[task.roleRequired], transition: 'width 0.3s' }} />
              </div>
              <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, textTransform: 'capitalize' }}>Role: {task.roleRequired}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
