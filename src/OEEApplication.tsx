import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ComposedChart, ScatterChart, Scatter, ReferenceLine
} from 'recharts';
import {
  LayoutDashboard, ClipboardList, CheckSquare, Activity, History, Bot, Settings,
  LogOut, Bell, User, Play, Pause, AlertTriangle, AlertOctagon, Wrench, CheckCircle,
  ChevronRight, ArrowRight, Save, Send, Edit, X, Plus, Search, Filter, MessageSquare, Upload, Users,
  Eye, Download, Scale, PackageMinus, Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';

const BiomontLogo = ({ className = '' }) => (
  <svg viewBox="0 0 220 82" role="img" aria-label="Biomont" className={className}>
    <ellipse cx="110" cy="41" rx="106" ry="36" fill="#e30613" stroke="white" strokeWidth="3" />
    <text x="110" y="56" textAnchor="middle" fill="white" fontSize="48" fontWeight="700" fontFamily="Arial, sans-serif">Biomont</text>
  </svg>
);

const COLORS = {
  success: '#10b981', // emerald-500
  warning: '#f59e0b', // amber-500
  critical: '#f43f5e', // rose-500
  primary: '#2563eb', // blue-600
  neutral: '#64748b'  // slate-500
};

const getOEEColor = (value) => {
  if (value >= 85) return COLORS.success;
  if (value >= 70) return COLORS.warning;
  return COLORS.critical;
};

const timeToMinutes = (time) => {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const elapsedMinutes = (start, end) => {
  if (!start || !end) return 0;
  let difference = timeToMinutes(end) - timeToMinutes(start);
  if (difference < 0) difference += 24 * 60;
  return difference;
};

const currentTimeInput = () => new Date().toTimeString().slice(0, 5);

const DUMMY_USER = { name: "Carlos Mendoza", plant: "Planta Norte - Farma", id: "OP-042" };
const SHIFTS = ["Mañana (06:00 - 14:00)", "Tarde (14:00 - 22:00)", "Noche (22:00 - 06:00)"];
const RESPONSIBLE_OPERATORS = [{ id: "RESP-001", name: "Juanito" }];
const INITIAL_SUPPORT_OPERATORS = [
  { id: "OP-042", name: "Carlos Mendoza" },
  { id: "OP-051", name: "María Torres" },
  { id: "OP-063", name: "José Ramírez" },
  { id: "OP-078", name: "Lucía Flores" }
];
const DEMO_CREDENTIALS = {
  supervisor: { username: "molin", password: "password", name: "Molin" },
  responsible_operator: { username: "Juanito", password: "password", name: "Juanito" }
};

const WORK_ORDER_STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  pending_assignment: { label: 'Pendiente de asignar', variant: 'warning' },
  assigned: { label: 'Asignado', variant: 'primary' },
  in_progress: { label: 'En proceso', variant: 'success' },
  review: { label: 'En revisión', variant: 'warning' },
  observed: { label: 'Observado', variant: 'critical' },
  validated: { label: 'Validado', variant: 'success' }
};

const MACHINES = [
  { id: "B-01", name: "Blistera B-01", line: "Línea Empaque 1", status: "available", standardSpeed: 100 },
  { id: "E-01", name: "Estuchadora E-01", line: "Línea Empaque 1", status: "maintenance", standardSpeed: 120 },
  { id: "L-02", name: "Llenadora L-02", line: "Línea Líquidos 2", status: "occupied", standardSpeed: 80 },
];

const LOSS_CAUSES = {
  availability: ["Cambio de formato", "Limpieza profunda", "Mantenimiento preventivo", "Avería mecánica", "Avería eléctrica", "Falta de material"],
  performance: ["Microparada de máquina", "Microparada de línea", "Atasco de material", "Ajuste menor"],
  quality: ["Blister mal sellado", "Falta de lote/vencimiento", "Volumen incorrecto", "Contaminación cruzada"]
};
const CHART_DATA_TREND = [];
const CHART_DATA_PARETO = [];

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
type BadgeVariant = 'default' | 'success' | 'warning' | 'critical' | 'primary';

const Card = ({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props} className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, variant = 'default', className = '', ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) => {
  const variants: Record<BadgeVariant, string> = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    critical: "bg-rose-100 text-rose-700",
    primary: "bg-blue-100 text-blue-700"
  };
  return (
    <span {...props} className={`px-2.5 py-1 text-xs font-semibold rounded-full ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

const Button = ({ children, variant = 'primary', className = '', type = 'button', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) => {
  const baseStyle = "inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-500",
    danger: "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-sm",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 shadow-sm",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100"
  };
  return (
    <button {...props} type={type} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

const TimeField = ({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) => {
  const [hour = '00', minute = '00'] = (value || '00:00').split(':');
  const update = (nextHour: string, nextMinute: string) => onChange(`${nextHour}:${nextMinute}`);
  return (
    <div className="min-w-44">
      <label className="mb-1 block text-xs font-medium text-slate-400">{label}</label>
      <div className="flex items-center gap-1 rounded-lg border border-slate-500 bg-white p-1 text-slate-900 shadow-inner">
        <select aria-label={`${label}: hora`} value={hour} onChange={(event) => update(event.target.value, minute)} className="w-full rounded border-0 bg-transparent px-2 py-1.5 font-semibold outline-none">
          {Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0')).map(option => <option key={option}>{option}</option>)}
        </select>
        <span className="font-bold text-slate-400">:</span>
        <select aria-label={`${label}: minutos`} value={minute} onChange={(event) => update(hour, event.target.value)} className="w-full rounded border-0 bg-transparent px-2 py-1.5 font-semibold outline-none">
          {Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0')).map(option => <option key={option}>{option}</option>)}
        </select>
      </div>
    </div>
  );
};

const RecordDetails = ({ record, metrics }: { record: any; metrics: any; readOnly?: boolean }) => {
  if (!record || !metrics) return null;
  return <div className="space-y-5"><div className="grid grid-cols-2 gap-4"><div><p className="text-xs text-slate-500">OT</p><p className="font-bold">{record.workOrderId || record.id}</p></div><div><p className="text-xs text-slate-500">Producto</p><p className="font-bold">{record.product}</p></div><div><p className="text-xs text-slate-500">Máquina</p><p className="font-semibold">{record.machine}</p></div><div><p className="text-xs text-slate-500">Operario</p><p className="font-semibold">{record.operator || 'Pendiente'}</p></div></div><div className="grid grid-cols-4 gap-2">{[['OEE',metrics.oee],['Disp.',metrics.a],['Rend.',metrics.p],['Calidad',metrics.q]].map(([label,value]) => <div key={label} className="rounded-lg bg-slate-50 p-3 text-center"><p className="text-xs text-slate-500">{label}</p><p className="font-bold">{Number(value).toFixed(1)}%</p></div>)}</div><div className="rounded-lg border border-slate-200 p-4 text-sm"><p><strong>Horario manual:</strong> {record.processStart || '--:--'} a {record.processEnd || '--:--'}</p><p className="mt-1"><strong>Producción:</strong> {Number(record.realQty || 0).toLocaleString()} und · <strong>Velocidad estándar:</strong> {Number(record.standardSpeed || 0)} und/min</p><p className="mt-1"><strong>Eventos:</strong> {(record.losses || []).length} · <strong>Sobrepesos:</strong> {(record.overweights || []).length} · <strong>Descartes:</strong> {(record.materialDiscards || []).length}</p></div></div>;
};

export default function OEEApplication() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(null); // 'supervisor', 'responsible_operator'
  const [currentView, setCurrentView] = useState('dashboard');
  const [loginRole, setLoginRole] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  
  // App Data State
  const [records, setRecords] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [importMessage, setImportMessage] = useState('');
  const [responsibleAssignments, setResponsibleAssignments] = useState({});
  const [workOrderFilters, setWorkOrderFilters] = useState({ code: '', product: '', line: '', quantity: '', status: '', responsible: '' });
  const workOrdersFileInputRef = useRef(null);
  const [selectedLiveOrder, setSelectedLiveOrder] = useState(null);
  const [dashboardProduct, setDashboardProduct] = useState('');
  
  // Active Operator Session State
  const [activeSession, setActiveSession] = useState(null);

  const currentUser = role ? DEMO_CREDENTIALS[role] : null;

  const handleLogin = (event) => {
    event.preventDefault();
    if (!loginRole) return;
    setRole(loginRole);
    setIsLoggedIn(true);
    setCurrentView(loginRole === 'responsible_operator' ? 'work_orders' : 'dashboard');
  };

  const logout = () => {
    setIsLoggedIn(false);
    setRole(null);
    setActiveSession(null);
  };

  const getImportValue = (row, aliases) => {
    const normalizedAliases = aliases.map(alias => alias.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const entry = Object.entries(row).find(([key]) =>
      normalizedAliases.includes(String(key).toLowerCase().replace(/[^a-z0-9]/g, ''))
    );
    return entry ? entry[1] : '';
  };

  const parsePlannedQuantity = (value) => {
    if (typeof value === 'number') return value;
    const text = String(value ?? '').trim();
    if (!text) return 0;
    const normalized = text.includes(',')
      ? text.replace(/\./g, '').replace(',', '.')
      : text.replace(/[^0-9.-]/g, '');
    return Number(normalized) || 0;
  };

  const handleWorkOrdersImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

      const importedOrders = rows.map((row, index) => {
        const id = String(getImportValue(row, ['Código OT', 'Codigo OT', 'OT', 'Orden', 'Orden de trabajo', 'ID'])).trim();
        const statusText = String(getImportValue(row, ['Estado', 'Status'])).toLowerCase();
        return {
          id,
          product: String(getImportValue(row, ['Producto', 'Descripción', 'Descripcion', 'Material'])).trim() || 'Sin producto',
          line: String(getImportValue(row, ['Línea', 'Linea', 'Línea/Máquina', 'Linea/Maquina'])).trim() || 'Sin línea',
          machine: String(getImportValue(row, ['Máquina', 'Maquina', 'Equipo'])).trim() || 'Sin máquina',
          plannedQty: parsePlannedQuantity(getImportValue(row, ['Planificado', 'Cantidad planificada', 'Cantidad', 'Qty'])),
          standardSpeed: parsePlannedQuantity(getImportValue(row, ['Velocidad estándar', 'Velocidad estandar', 'Velocidad estándar (und/min)', 'Velocidad', 'Standard speed'])),
          status: 'pending_assignment',
          date: String(getImportValue(row, ['Fecha', 'Fecha OT', 'Date'])).trim()
        };
      }).filter(order => order.id);

      if (!importedOrders.length) {
        throw new Error('El archivo no contiene filas de órdenes de trabajo.');
      }

      setWorkOrders(importedOrders);
      setImportMessage(`${importedOrders.length} orden(es) de trabajo cargada(s) desde ${file.name}.`);
    } catch (error) {
      setImportMessage('No se pudo leer el Excel. Verifica que la primera hoja incluya el listado de OT.');
    } finally {
      event.target.value = '';
    }
  };

  const downloadWorkOrderTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet([{
      'Código OT': '', Producto: '', Línea: '', Máquina: '', 'Cantidad planificada': '',
      'Velocidad estándar (und/min)': '', Fecha: ''
    }]);
    worksheet['!cols'] = [{ wch: 18 }, { wch: 32 }, { wch: 24 }, { wch: 24 }, { wch: 22 }, { wch: 30 }, { wch: 14 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ordenes OT');
    XLSX.writeFile(workbook, 'Plantilla_Ordenes_OT_Biomont.xlsx');
  };

  const assignResponsibleOperator = (order, operatorId) => {
    setResponsibleAssignments(current => ({ ...current, [order.id]: operatorId }));
    setWorkOrders(current => current.map(workOrder => workOrder.id === order.id ? { ...workOrder, status: operatorId ? 'assigned' : 'pending_assignment' } : workOrder));
  };

  // Helper to calculate active session OEE
  const calculateSessionMetrics = (session) => {
    if (!session) return { a: 0, p: 0, q: 0, oee: 0 };
    
    const processMinutes = elapsedMinutes(session.processStart, session.processEnd);
    const plannedTimeMin = processMinutes;
    
    // Calculate total lost time by type
    let availLoss = 0, perfLoss = 0;
    session.losses.forEach(l => {
      if (l.category === 'availability') availLoss += parseInt(l.duration);
      if (l.category === 'performance') perfLoss += parseInt(l.duration);
    });

    const operatingTime = Math.max(0, plannedTimeMin - availLoss);
    const availability = plannedTimeMin > 0 ? (operatingTime / plannedTimeMin) * 100 : 0;

    // La velocidad real se obtiene de la producción y del horario ingresado por el operario.
    const standardSpeed = Number(session.standardSpeed) || 0;
    const speedSegments = session.losses.filter(loss => loss.category === 'performance' && loss.duration > 0 && loss.speed > 0);
    const speedMinutes = speedSegments.reduce((total, segment) => total + Number(segment.duration), 0);
    const weightedSpeed = speedMinutes > 0
      ? speedSegments.reduce((total, segment) => total + Number(segment.speed) * Number(segment.duration), 0) / speedMinutes
      : 0;
    const reportedSpeed = operatingTime > 0 && session.realQty > 0 ? session.realQty / operatingTime : 0;
    const effectiveSpeed = weightedSpeed || reportedSpeed;
    const performance = standardSpeed > 0 ? (effectiveSpeed / standardSpeed) * 100 : 0;

    // Quality
    const goodQty = Math.max(0, Number(session.realQty) - Number(session.rejectQty || 0));
    const quality = session.realQty > 0 ? (goodQty / session.realQty) * 100 : 0;

    const oee = (availability/100) * (performance/100) * (quality/100) * 100;

    return {
      a: Math.max(0, Math.min(100, availability)),
      p: Math.max(0, Math.min(100, performance)),
      q: Math.max(0, Math.min(100, quality)),
      oee: Math.max(0, Math.min(100, oee)),
      operatingTime,
      availLoss,
      microStopMinutes: perfLoss,
      standardSpeed,
      reportedSpeed,
      effectiveSpeed,
      processMinutes
    };
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8 bg-blue-600 text-center">
            <BiomontLogo className="w-52 h-auto mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white">BIOEE</h1>
            <p className="text-blue-100 mt-2">Sistema de Gestión y Medición de OEE</p>
          </div>
          <form className="p-8 space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Perfil de acceso</label>
              <select className="w-full rounded-lg border border-slate-300 p-3" value={loginRole} onChange={(event) => setLoginRole(event.target.value)}>
                <option value="">Selecciona un perfil</option>
                <option value="supervisor">Supervisor</option>
                <option value="responsible_operator">Operario responsable</option>
              </select>
            </div>
            <Button className="w-full !py-3" type="submit" disabled={!loginRole}><User size={18} /> Ingresar</Button>
          </form>
        </div>
      </div>
    );
  }

  const SidebarItem = ({ icon: Icon, label, viewId, requiredRole }: { icon: React.ElementType; label: string; viewId: string; requiredRole?: string }) => {
    if (requiredRole && requiredRole !== role && role !== 'admin') return null;
    const isActive = currentView === viewId;
    return (
      <button
        onClick={() => setCurrentView(viewId)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
          isActive ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <Icon size={20} />
        {isSidebarOpen && <span>{label}</span>}
      </button>
    );
  };

  const LegacyDashboardView = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dashboard de Planta</h2>
          <p className="text-slate-500">Resumen de indicadores OEE - Planta Norte</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="!py-2">Hoy</Button>
          <Button variant="secondary" className="!py-2">Esta Semana</Button>
          <Button variant="secondary" className="!py-2"><Filter size={16} /> Filtros</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Activity size={64} /></div>
          <p className="text-sm font-medium text-slate-500 mb-1">OEE Global Actual</p>
          <div className="flex items-end gap-3">
            <h3 className="text-4xl font-bold text-amber-500">76.4%</h3>
            <span className="text-sm font-medium text-rose-500 mb-1">▼ 2.1%</span>
          </div>
          <div className="mt-4 w-full bg-slate-100 rounded-full h-2">
            <div className="bg-amber-500 h-2 rounded-full" style={{ width: '76.4%' }}></div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Objetivo: 85%</p>
        </Card>
        
        <Card className="p-6">
          <p className="text-sm font-medium text-slate-500 mb-1">Disponibilidad</p>
          <h3 className="text-3xl font-bold text-slate-800">88.2%</h3>
          <div className="mt-4 flex justify-between text-xs text-slate-500 border-t pt-2">
            <span>T. Planificado: 480m</span>
            <span>T. Operativo: 423m</span>
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-sm font-medium text-slate-500 mb-1">Rendimiento</p>
          <h3 className="text-3xl font-bold text-slate-800">89.5%</h3>
          <div className="mt-4 flex justify-between text-xs text-slate-500 border-t pt-2">
            <span>Vel. Ideal: 100/m</span>
            <span>Vel. Real: 89/m</span>
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-sm font-medium text-slate-500 mb-1">Calidad</p>
          <h3 className="text-3xl font-bold text-emerald-500">96.8%</h3>
          <div className="mt-4 flex justify-between text-xs text-slate-500 border-t pt-2">
            <span>Producido: 37.8k</span>
            <span className="text-rose-500">Rechazo: 1.2k</span>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Tendencia OEE (Últimos 7 días)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={CHART_DATA_TREND}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis domain={[60, 100]} axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend />
                <Line type="monotone" dataKey="oee" name="OEE" stroke={COLORS.primary} strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                <Line type="monotone" dataKey="a" name="Disp." stroke={COLORS.warning} strokeWidth={2} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="p" name="Rend." stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="q" name="Calidad" stroke={COLORS.success} strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Pareto de Pérdidas (Minutos)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={CHART_DATA_PARETO} margin={{top: 20, right: 20, bottom: 20, left: 0}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="cause" scale="band" tick={{fontSize: 10, fill: '#64748b'}} interval={0} angle={-45} textAnchor="end" />
                <YAxis yAxisId="left" tick={{fontSize: 12}} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{fontSize: 12}} tickFormatter={(v)=>`${v}%`} />
                <RechartsTooltip />
                <Bar yAxisId="left" dataKey="minutes" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#0f172a" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );

  const DashboardView = () => {
    const liveRecord = activeSession ? { ...activeSession, id: `LIVE-${activeSession.id}`, date: new Date().toISOString().slice(0, 10), metrics: calculateSessionMetrics(activeSession), status: 'in_progress' } : null;
    const sourceRecords = [...records, ...(liveRecord ? [liveRecord] : [])];
    const average = (key) => sourceRecords.length ? sourceRecords.reduce((sum, record) => sum + Number(record.metrics?.[key] || 0), 0) / sourceRecords.length : 0;
    const products = Array.from(new Set(sourceRecords.map(record => record.product).filter(Boolean)));
    const qualitySummary = sourceRecords.reduce((summary, record) => ({
      reprocess: summary.reprocess + Number(record.reprocessQty || 0),
      waste: summary.waste + Number(record.wasteQty || 0),
      produced: summary.produced + Number(record.realQty || 0)
    }), { reprocess: 0, waste: 0, produced: 0 });
    const materialSummary = sourceRecords.flatMap(record => record.materialDiscards || []).reduce((summary, item) => {
      const key = `${item.type}|${item.unit}`;
      summary[key] = (summary[key] || 0) + Number(item.quantity || 0);
      return summary;
    }, {});
    const trendData = sourceRecords.map(record => ({ name: record.workOrderId || record.id, oee: Number(record.metrics?.oee || 0), a: Number(record.metrics?.a || 0), p: Number(record.metrics?.p || 0), q: Number(record.metrics?.q || 0) }));
    const lossMap = sourceRecords.flatMap(record => record.losses || []).filter(loss => loss.category === 'availability').reduce((map, loss) => {
      map[loss.cause] = (map[loss.cause] || 0) + Number(loss.duration || 0);
      return map;
    }, {});
    const paretoData = Object.entries(lossMap).map(([cause, minutes]) => ({ cause, minutes }));
    const overweightData = sourceRecords.filter(record => !dashboardProduct || record.product === dashboardProduct).flatMap(record => (record.overweights || []).map((item, index) => ({
      sequence: `${record.workOrderId || record.id}-${index + 1}`, weight: Number(item.weight), quantity: Number(item.quantity), product: record.product
    })));
    const configuredTarget = sourceRecords.find(record => (!dashboardProduct || record.product === dashboardProduct) && Number(record.targetWeight) > 0)?.targetWeight;
    const centralWeight = Number(configuredTarget) || (overweightData.length ? overweightData.reduce((sum, item) => sum + item.weight * item.quantity, 0) / overweightData.reduce((sum, item) => sum + item.quantity, 0) : 0);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div><h2 className="text-2xl font-bold text-slate-800">Dashboard de Planta</h2><p className="text-slate-500">Indicadores calculados únicamente con OT cargadas y registros reales.</p></div>
          <div><label className="mb-1 block text-xs font-semibold text-slate-500">Filtrar sobrepeso por producto</label><select className="min-w-64 rounded-lg border border-slate-300 bg-white p-2.5" value={dashboardProduct} onChange={(event) => setDashboardProduct(event.target.value)}><option value="">Todos los productos</option>{products.map(product => <option key={product}>{product}</option>)}</select></div>
        </div>
        {sourceRecords.length === 0 ? <Card className="p-12 text-center"><Activity className="mx-auto mb-3 text-slate-300" size={48}/><h3 className="font-bold text-slate-700">Aún no hay datos productivos</h3><p className="mt-1 text-slate-500">Carga una plantilla de OT y registra una OEE para alimentar este dashboard.</p></Card> : <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[['OEE global', average('oee'), 'border-blue-500'], ['Disponibilidad', average('a'), 'border-amber-500'], ['Rendimiento', average('p'), 'border-purple-500'], ['Calidad', average('q'), 'border-emerald-500']].map(([label, value, border]) => <Card key={label} className={`border-l-4 ${border} p-5`}><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold" style={{ color: label === 'OEE global' ? getOEEColor(Number(value)) : undefined }}>{Number(value).toFixed(1)}%</p></Card>)}
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="p-6 xl:col-span-2"><h3 className="mb-5 font-bold text-slate-800">OEE por orden de trabajo</h3><div className="h-72"><ResponsiveContainer><LineChart data={trendData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis domain={[0,100]}/><RechartsTooltip/><Legend/><Line dataKey="oee" name="OEE" stroke={COLORS.primary} strokeWidth={3}/><Line dataKey="a" name="Disponibilidad" stroke={COLORS.warning}/><Line dataKey="p" name="Rendimiento" stroke="#8b5cf6"/><Line dataKey="q" name="Calidad" stroke={COLORS.success}/></LineChart></ResponsiveContainer></div></Card>
            <Card className="p-6"><h3 className="font-bold text-slate-800">Calidad registrada</h3><div className="mt-6 space-y-4"><div className="rounded-lg bg-slate-50 p-4"><p className="text-sm text-slate-500">Producción total</p><p className="text-2xl font-bold">{qualitySummary.produced.toLocaleString()} und</p></div><div className="grid grid-cols-2 gap-3"><div className="rounded-lg bg-amber-50 p-4 text-amber-800"><p className="text-sm">Reproceso</p><p className="text-xl font-bold">{qualitySummary.reprocess.toLocaleString()}</p></div><div className="rounded-lg bg-rose-50 p-4 text-rose-800"><p className="text-sm">Desperdicio</p><p className="text-xl font-bold">{qualitySummary.waste.toLocaleString()}</p></div></div></div></Card>
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="p-6"><h3 className="mb-5 font-bold text-slate-800">Pérdidas de disponibilidad reales</h3>{paretoData.length ? <div className="h-64"><ResponsiveContainer><BarChart data={paretoData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="cause" tick={{fontSize:10}}/><YAxis/><RechartsTooltip/><Bar dataKey="minutes" name="Minutos" fill={COLORS.critical}/></BarChart></ResponsiveContainer></div> : <p className="py-16 text-center text-slate-500">Sin pérdidas registradas.</p>}</Card>
            <Card className="p-6"><h3 className="mb-5 font-bold text-slate-800">Control de sobrepeso</h3>{overweightData.length ? <div className="h-64"><ResponsiveContainer><ScatterChart><CartesianGrid/><XAxis type="category" dataKey="sequence" name="Registro"/><YAxis type="number" dataKey="weight" name="Peso" unit=" g" domain={['auto','auto']}/><RechartsTooltip cursor={{strokeDasharray:'3 3'}}/><ReferenceLine y={centralWeight} stroke={COLORS.primary} strokeWidth={2} label="Promedio"/><Scatter data={overweightData} fill={COLORS.warning}/></ScatterChart></ResponsiveContainer></div> : <p className="py-16 text-center text-slate-500">Sin pesos registrados para el filtro.</p>}</Card>
          </div>
          <Card className="p-6"><h3 className="font-bold text-slate-800">Descarte de materiales para planificación</h3><div className="mt-4 grid gap-3 md:grid-cols-2">{Object.keys(materialSummary).length ? Object.entries(materialSummary).map(([key, quantity]) => { const [type, unit] = key.split('|'); return <div key={key} className="rounded-lg border border-slate-200 p-4"><p className="text-sm text-slate-500">Material de {type.toLowerCase()}</p><p className="text-2xl font-bold text-slate-800">{Number(quantity).toLocaleString()} <span className="text-sm font-medium">{unit}</span></p></div>; }) : <p className="text-slate-500">Sin descartes registrados.</p>}</div></Card>
        </>}
      </div>
    );
  };

  const WorkOrdersView = () => {
    const activeStatuses = ['pending_assignment', 'assigned', 'in_progress'];
    const normalized = (value) => String(value || '').toLowerCase();
    const visibleWorkOrders = workOrders.filter((order) => {
      if (!activeStatuses.includes(order.status)) return false;
      const responsible = RESPONSIBLE_OPERATORS.find(operator => operator.id === responsibleAssignments[order.id])?.name || '';
      return normalized(order.id).includes(normalized(workOrderFilters.code))
        && normalized(order.product).includes(normalized(workOrderFilters.product))
        && normalized(`${order.line} ${order.machine}`).includes(normalized(workOrderFilters.line))
        && String(order.plannedQty).includes(workOrderFilters.quantity.replace(/[^0-9]/g, ''))
        && (!workOrderFilters.status || order.status === workOrderFilters.status)
        && normalized(responsible).includes(normalized(workOrderFilters.responsible));
    });
    const updateFilter = (field, value) => setWorkOrderFilters(current => ({ ...current, [field]: value }));

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Órdenes de Trabajo</h2>
            <p className="text-slate-500">{role === 'supervisor' ? 'Carga, consulta y asigna el operario responsable de las OT.' : 'Seleccione una OT para iniciar el registro de producción.'}</p>
          </div>
          <div className="flex items-center gap-3">
            {role === 'supervisor' && (
              <>
                <input ref={workOrdersFileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleWorkOrdersImport} />
                <Button variant="secondary" className="!py-2" onClick={downloadWorkOrderTemplate}><Download size={18} /> Descargar plantilla</Button>
                <Button variant="primary" className="!py-2" onClick={() => workOrdersFileInputRef.current?.click()}><Upload size={18} /> Cargar Excel</Button>
              </>
            )}
            <Button variant="secondary" className="!py-2"><Search size={18} /> Buscar</Button>
          </div>
        </div>

        {importMessage && <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{importMessage}</div>}

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
                  <th className="p-4 font-semibold">Código OT</th><th className="p-4 font-semibold">Producto</th><th className="p-4 font-semibold">Línea/Máquina</th><th className="p-4 font-semibold">Planificado</th><th className="p-4 font-semibold">Vel. estándar</th><th className="p-4 font-semibold">Estado</th><th className="p-4 font-semibold">{role === 'supervisor' ? 'Operario responsable / Vista' : 'Acción'}</th>
                </tr>
                {role === 'supervisor' && (
                  <tr className="border-b border-slate-200 bg-white">
                    <th className="p-2"><input className="w-full rounded border border-slate-300 p-2 text-xs" placeholder="Filtrar código" value={workOrderFilters.code} onChange={(e) => updateFilter('code', e.target.value)} /></th>
                    <th className="p-2"><input className="w-full rounded border border-slate-300 p-2 text-xs" placeholder="Filtrar producto" value={workOrderFilters.product} onChange={(e) => updateFilter('product', e.target.value)} /></th>
                    <th className="p-2"><input className="w-full rounded border border-slate-300 p-2 text-xs" placeholder="Filtrar línea o máquina" value={workOrderFilters.line} onChange={(e) => updateFilter('line', e.target.value)} /></th>
                    <th className="p-2"><input className="w-full rounded border border-slate-300 p-2 text-xs" placeholder="Filtrar cantidad" value={workOrderFilters.quantity} onChange={(e) => updateFilter('quantity', e.target.value)} /></th>
                    <th className="p-2"></th>
                    <th className="p-2"><select className="w-full rounded border border-slate-300 p-2 text-xs" value={workOrderFilters.status} onChange={(e) => updateFilter('status', e.target.value)}><option value="">Todos</option>{activeStatuses.map(status => <option key={status} value={status}>{WORK_ORDER_STATUS[status].label}</option>)}</select></th>
                    <th className="p-2"><select className="w-full rounded border border-slate-300 p-2 text-xs" value={workOrderFilters.responsible} onChange={(e) => updateFilter('responsible', e.target.value)}><option value="">Todos</option><option value="Juanito">Juanito</option></select></th>
                  </tr>
                )}
              </thead>
              <tbody>
                {visibleWorkOrders.map((ot) => (
                  <tr key={ot.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-4 font-medium text-slate-800">{ot.id}</td><td className="p-4 text-slate-600">{ot.product}</td>
                    <td className="p-4"><div className="text-sm text-slate-800">{ot.line}</div><div className="text-xs text-slate-500">{ot.machine}</div></td>
                    <td className="p-4 text-slate-600">{ot.plannedQty.toLocaleString()} und</td>
                    <td className="p-4 font-semibold text-purple-700">{Number(ot.standardSpeed || 0).toLocaleString()} und/min</td>
                    <td className="p-4"><Badge variant={WORK_ORDER_STATUS[ot.status].variant}>{WORK_ORDER_STATUS[ot.status].label}</Badge></td>
                    <td className="p-4">
                      {role === 'supervisor' ? (
                        <div className="flex min-w-56 items-center gap-2"><select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={responsibleAssignments[ot.id] || ''} onChange={(event) => assignResponsibleOperator(ot, event.target.value)}><option value="">Selecciona responsable</option>{RESPONSIBLE_OPERATORS.map(operator => <option key={operator.id} value={operator.id}>{operator.name}</option>)}</select>{ot.status === 'in_progress' && <button title="Ver OEE en tiempo real" onClick={() => setSelectedLiveOrder(activeSession?.id === ot.id ? activeSession : ot)} className="rounded-lg border border-blue-200 p-2 text-blue-600 hover:bg-blue-50"><Eye size={18}/></button>}</div>
                      ) : (
                        <Button variant="primary" className="!px-4 !py-2 text-sm" disabled={ot.status === 'pending_assignment'} onClick={() => {
                          const now = currentTimeInput();
                           setActiveSession({...ot, operator: currentUser.name, shift: SHIFTS[0], realQty: 0, goodQty: 0, rejectQty: 0, reprocessQty: 0, wasteQty: 0, losses: [], supportOperators: [], overweights: [], materialDiscards: [], targetWeight: '', standardSpeed: Number(ot.standardSpeed) || MACHINES.find(machine => machine.name === ot.machine)?.standardSpeed || 0, processStart: now, processEnd: now, performanceEndTime: ''});
                          setWorkOrders(current => current.map(order => order.id === ot.id ? { ...order, status: 'in_progress' } : order));
                          setCurrentView('active_production');
                        }}>Registrar OEE <ArrowRight size={16} /></Button>
                      )}
                    </td>
                  </tr>
                ))}
                {visibleWorkOrders.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-500">No hay OT cargadas. Descarga la plantilla y carga el Excel para comenzar.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
        <Modal isOpen={Boolean(selectedLiveOrder)} onClose={() => setSelectedLiveOrder(null)} title="Detalle OEE en tiempo real"><RecordDetails record={selectedLiveOrder} metrics={selectedLiveOrder ? calculateSessionMetrics(selectedLiveOrder) : null} readOnly /></Modal>
      </div>
    );
  };
  const ActiveProductionView = () => {
    const [lossModalOpen, setLossModalOpen] = useState(false);
    const [lossType, setLossType] = useState('availability'); // availability, performance, quality
    const [lossForm, setLossForm] = useState({ cause: '', duration: '', reprocessQty: '', wasteQty: '', speed: '', speedEndTime: '', comment: '' });
    const [editingLossId, setEditingLossId] = useState(null);
    
    const [qtyModalOpen, setQtyModalOpen] = useState(false);
    const [qtyForm, setQtyForm] = useState({ produced: '' });
    const [ticketModalOpen, setTicketModalOpen] = useState(false);
    const [maintenanceTicket, setMaintenanceTicket] = useState(null);
    const [ticketForm, setTicketForm] = useState({ priority: 'Media', detail: '', reportedBy: DUMMY_USER.name });
    const [supportModalOpen, setSupportModalOpen] = useState(false);
    const [sharedSupportHours, setSharedSupportHours] = useState('');
    const [supportOperators, setSupportOperators] = useState(INITIAL_SUPPORT_OPERATORS);
    const [supportDraft, setSupportDraft] = useState([]);
    const [newSupportName, setNewSupportName] = useState('');
    const [overweightModalOpen, setOverweightModalOpen] = useState(false);
    const [overweightDraft, setOverweightDraft] = useState([{ weight: '', quantity: '' }]);
    const [targetWeight, setTargetWeight] = useState('');
    const [materialModalOpen, setMaterialModalOpen] = useState(false);
    const [materialForm, setMaterialForm] = useState({ type: 'Envasado', material: '', quantity: '', unit: 'unidades', comment: '' });

    if (!activeSession) return <div>No hay sesión activa.</div>;

    const metrics = calculateSessionMetrics(activeSession);
    const requiresMaintenanceTicket = lossForm.cause === 'Avería mecánica' || lossForm.cause === 'Avería eléctrica';
    const performanceLosses = activeSession.losses.filter(loss => loss.category === 'performance');
    const editingPerformanceIndex = performanceLosses.findIndex(loss => loss.id === editingLossId);
    const performanceStartTime = editingPerformanceIndex >= 0
      ? (editingPerformanceIndex === 0 ? activeSession.processStart : performanceLosses[editingPerformanceIndex - 1].speedEndTime)
      : (activeSession.performanceEndTime || activeSession.processStart);

    const updateProcessTime = (field, value) => {
      setActiveSession(current => current ? { ...current, [field]: value } : current);
    };

    const openSupportModal = () => {
      setSupportDraft((activeSession.supportOperators || []).map(item => ({ ...item })));
      setSupportModalOpen(true);
    };

    const toggleSupportOperator = (operator) => {
      setSupportDraft(current => current.some(item => item.id === operator.id) ? current.filter(item => item.id !== operator.id) : [...current, { ...operator, hours: '' }]);
    };

    const updateSupportHours = (operatorId, hours) => {
      setSupportDraft(current => current.map(item => item.id === operatorId ? { ...item, hours } : item));
    };

    const applySharedSupportHours = () => {
      if (!sharedSupportHours) return;
      setSupportDraft(current => current.map(item => ({ ...item, hours: sharedSupportHours })));
    };

    const normalizeLosses = (session, losses) => {
      let performanceCursor = session.processStart;
      const normalizedLosses = losses.map(loss => {
        if (loss.category !== 'performance') return loss;
        const duration = elapsedMinutes(performanceCursor, loss.speedEndTime);
        performanceCursor = loss.speedEndTime;
        return { ...loss, duration };
      });
      const qualityLosses = normalizedLosses.filter(loss => loss.category === 'quality');
      const reprocessQty = qualityLosses.reduce((sum, loss) => sum + Number(loss.reprocessQty || 0), 0);
      const wasteQty = qualityLosses.reduce((sum, loss) => sum + Number(loss.wasteQty || 0), 0);
      const rejectQty = reprocessQty + wasteQty;
      return {
        ...session,
        losses: normalizedLosses,
        performanceEndTime: performanceCursor === session.processStart ? '' : performanceCursor,
        reprocessQty,
        wasteQty,
        rejectQty,
        goodQty: Math.max(0, Number(session.realQty || 0) - rejectQty)
      };
    };

    const resetLossEditor = () => {
      setEditingLossId(null);
      setLossForm({ cause: '', duration: '', reprocessQty: '', wasteQty: '', speed: '', speedEndTime: '', comment: '' });
      setMaintenanceTicket(null);
      setTicketForm({ priority: 'Media', detail: '', reportedBy: DUMMY_USER.name });
    };

    const openNewLoss = (category) => {
      resetLossEditor();
      setLossType(category);
      setLossModalOpen(true);
    };

    const openEditLoss = (loss) => {
      setEditingLossId(loss.id);
      setLossType(loss.category);
      setLossForm({
        cause: loss.cause || '', duration: String(loss.duration || ''),
        reprocessQty: String(loss.reprocessQty || ''), wasteQty: String(loss.wasteQty || ''),
        speed: String(loss.speed || ''), speedEndTime: loss.speedEndTime || '', comment: loss.comment || ''
      });
      setMaintenanceTicket(loss.ticket || null);
      setLossModalOpen(true);
    };

    const deleteLoss = (loss) => {
      if (!window.confirm(`¿Eliminar el evento "${loss.cause}"? Esta acción actualizará el OEE.`)) return;
      setActiveSession(current => normalizeLosses(current, current.losses.filter(item => item.id !== loss.id)));
    };

    const addSupportOperator = () => {
      const name = newSupportName.trim();
      if (!name) return;
      const operator = { id: `EXT-${Date.now().toString().slice(-6)}`, name };
      setSupportOperators(current => [...current, operator]);
      setSupportDraft(current => [...current, { ...operator, hours: '' }]);
      setNewSupportName('');
    };

    const saveSupportOperators = () => {
      setActiveSession(current => ({ ...current, supportOperators: supportDraft }));
      setSupportModalOpen(false);
    };

    const handleCreateMaintenanceTicket = () => {
      const date = new Date();
      const ticketCode = `MT-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(Date.now()).slice(-5)}`;
      setMaintenanceTicket({
        code: ticketCode,
        equipment: activeSession.machine,
        cause: lossType === 'performance' ? 'Tramo de velocidad' : lossForm.cause,
        ...ticketForm,
        createdAt: date.toLocaleTimeString()
      });
      setTicketModalOpen(false);
    };

    const handleAddLoss = () => {
      const speedDuration = lossType === 'performance'
        ? elapsedMinutes(performanceStartTime, lossForm.speedEndTime)
        : parseInt(lossForm.duration) || 0;
      const newLoss = {
        id: Date.now(),
        category: lossType,
        cause: lossForm.cause,
        duration: speedDuration,
        qty: lossType === 'quality' ? (parseInt(lossForm.reprocessQty) || 0) + (parseInt(lossForm.wasteQty) || 0) : 0,
        reprocessQty: lossType === 'quality' ? parseInt(lossForm.reprocessQty) || 0 : 0,
        wasteQty: lossType === 'quality' ? parseInt(lossForm.wasteQty) || 0 : 0,
        comment: lossForm.comment,
        speed: lossType === 'performance' ? (parseFloat(lossForm.speed) || activeSession.standardSpeed) : 0,
        speedEndTime: lossType === 'performance' ? lossForm.speedEndTime : null,
        ticketCode: requiresMaintenanceTicket ? maintenanceTicket?.code : null,
        ticket: requiresMaintenanceTicket ? maintenanceTicket : null,
        time: new Date().toLocaleTimeString()
      };
      
      const nextLosses = editingLossId
        ? activeSession.losses.map(loss => loss.id === editingLossId ? { ...newLoss, id: editingLossId, time: loss.time } : loss)
        : [...activeSession.losses, newLoss];
      setActiveSession(normalizeLosses(activeSession, nextLosses));
      
      setLossModalOpen(false);
      resetLossEditor();
    };

    const handleUpdateQty = () => {
      const produced = parseInt(qtyForm.produced) || 0;
      setActiveSession({
        ...activeSession,
        realQty: activeSession.realQty + produced,
        goodQty: activeSession.goodQty + produced
      });
      setQtyModalOpen(false);
      setQtyForm({ produced: '' });
    };

    const saveOverweights = () => {
      const validRows = overweightDraft.filter(item => Number(item.weight) > 0 && Number(item.quantity) > 0).map(item => ({ id: Date.now() + Math.random(), weight: Number(item.weight), quantity: Number(item.quantity) }));
      if (!validRows.length) return;
      setActiveSession(current => ({ ...current, targetWeight: Number(targetWeight) || current.targetWeight, overweights: [...(current.overweights || []), ...validRows] }));
      setOverweightDraft([{ weight: '', quantity: '' }]);
      setOverweightModalOpen(false);
    };

    const saveMaterialDiscard = () => {
      if (!materialForm.material.trim() || Number(materialForm.quantity) <= 0) return;
      setActiveSession(current => ({ ...current, materialDiscards: [...(current.materialDiscards || []), { ...materialForm, id: Date.now(), quantity: Number(materialForm.quantity) }] }));
      setMaterialForm({ type: 'Envasado', material: '', quantity: '', unit: 'unidades', comment: '' });
      setMaterialModalOpen(false);
    };

    const handleFinish = () => {
      // Simulate sending to review
      const recordToSave = {
        ...activeSession,
        workOrderId: activeSession.id,
        id: `REC-${Date.now().toString().slice(-6)}`,
        status: 'review',
        metrics: metrics,
        date: new Date().toISOString().split('T')[0]
      };
      setRecords([...records, recordToSave]);
      setWorkOrders(current => current.map(order => order.id === activeSession.id ? { ...order, status: 'review' } : order));
      setActiveSession(null);
      setCurrentView('work_orders');
      // In a real app, show a toast notification here
      alert("Registro enviado a revisión del supervisor.");
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-300 pb-20">
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-lg"><Play className="fill-current" /></div>
            <div>
              <h2 className="text-xl font-bold">{activeSession.id}</h2>
              <p className="text-slate-400 text-sm">{activeSession.product} | {activeSession.machine}</p>
            </div>
          </div>
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <p className="text-slate-400">Operador</p>
              <div className="flex items-center gap-2">
                <p className="font-semibold">{activeSession.operator}</p>
                <button onClick={openSupportModal} title="Registrar operarios de apoyo" className="rounded-full bg-slate-700 p-1.5 text-blue-200 hover:bg-slate-600 hover:text-white">
                  <Users size={16} />
                </button>
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-end gap-2"><TimeField label="Inicio del proceso" value={activeSession.processStart} onChange={(value) => updateProcessTime('processStart', value)}/><span className="pb-3 text-slate-400">a</span><TimeField label="Fin del proceso" value={activeSession.processEnd} onChange={(value) => updateProcessTime('processEnd', value)}/></div>
            </div>
            <div className="text-center hidden md:block">
              <p className="text-slate-400">Planificado</p>
              <p className="font-semibold">{activeSession.plannedQty.toLocaleString()} und</p>
            </div>
          </div>
        </div>

        <Card className="p-4 bg-blue-50 border-blue-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-slate-800">Velocidad real calculada</p>
              <p className="text-sm text-slate-600">Se calcula automáticamente con las unidades producidas y la hora de inicio/finalización.</p>
            </div>
            <p className="text-2xl font-bold text-blue-700">{metrics.effectiveSpeed.toFixed(1)} <span className="text-sm font-medium">und/min</span></p>
          </div>
        </Card>

        {/* Real-time KPI Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-l-blue-500 bg-blue-50/50">
            <p className="text-sm font-medium text-slate-600">OEE Calculado</p>
            <h3 className="text-3xl font-bold" style={{color: getOEEColor(metrics.oee)}}>{metrics.oee.toFixed(1)}%</h3>
          </Card>
          <Card className="p-4 border-l-4 border-l-amber-500">
            <p className="text-sm font-medium text-slate-600">Disponibilidad</p>
            <h3 className="text-2xl font-bold text-slate-800">{metrics.a.toFixed(1)}%</h3>
            <p className="text-xs text-rose-500 mt-1">{metrics.availLoss} min perdidos</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-purple-500">
            <p className="text-sm font-medium text-slate-600">Rendimiento</p>
            <h3 className="text-2xl font-bold text-slate-800">{metrics.p.toFixed(1)}%</h3>
            <p className="text-xs text-purple-600 mt-1">{metrics.effectiveSpeed.toFixed(1)} / {metrics.standardSpeed} und/min</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-emerald-500">
            <p className="text-sm font-medium text-slate-600">Calidad</p>
            <h3 className="text-2xl font-bold text-slate-800">{metrics.q.toFixed(1)}%</h3>
            <p className="text-xs text-emerald-600 mt-1">{activeSession.goodQty} und buenas</p>
          </Card>
        </div>

        {/* Control Panel Buttons */}
        <h3 className="text-lg font-bold text-slate-800 mt-8 mb-4">Panel de Registro</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <button 
            onClick={() => setQtyModalOpen(true)}
            className="flex flex-col items-center justify-center p-6 bg-white border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group"
          >
            <div className="bg-blue-100 p-4 rounded-full text-blue-600 mb-3 group-hover:scale-110 transition-transform">
              <Plus size={32} />
            </div>
            <span className="font-bold text-slate-800 text-lg">Registrar Producción</span>
            <span className="text-sm text-slate-500">Actualizar contador</span>
          </button>
          <button onClick={() => { setTargetWeight(String(activeSession.targetWeight || '')); setOverweightModalOpen(true); }} className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-6 transition-all hover:border-cyan-500 hover:shadow-md"><div className="mb-3 rounded-full bg-cyan-100 p-4 text-cyan-700"><Scale size={32}/></div><span className="text-lg font-bold text-slate-800">Registrar sobrepeso</span><span className="text-sm text-slate-500">Peso y cantidad de productos</span></button>
          <button onClick={() => setMaterialModalOpen(true)} className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-6 transition-all hover:border-orange-500 hover:shadow-md"><div className="mb-3 rounded-full bg-orange-100 p-4 text-orange-700"><PackageMinus size={32}/></div><span className="text-lg font-bold text-slate-800">Descarte de material</span><span className="text-sm text-slate-500">Envasado o acondicionado</span></button>

          <button 
            onClick={() => openNewLoss('availability')}
            className="flex flex-col items-center justify-center p-6 bg-white border-2 border-slate-200 rounded-xl hover:border-amber-500 hover:shadow-md transition-all group"
          >
            <div className="bg-amber-100 p-4 rounded-full text-amber-600 mb-3 group-hover:scale-110 transition-transform">
              <Pause size={32} />
            </div>
            <span className="font-bold text-slate-800 text-lg">Detención (Disp.)</span>
            <span className="text-sm text-slate-500">Averías, limpieza, etc.</span>
          </button>

          <button 
             onClick={() => openNewLoss('performance')}
            className="flex flex-col items-center justify-center p-6 bg-white border-2 border-slate-200 rounded-xl hover:border-purple-500 hover:shadow-md transition-all group"
          >
            <div className="bg-purple-100 p-4 rounded-full text-purple-600 mb-3 group-hover:scale-110 transition-transform">
              <AlertOctagon size={32} />
            </div>
            <span className="font-bold text-slate-800 text-lg">Pérdida de Vel. (Rend.)</span>
            <span className="text-sm text-slate-500">Microparadas, atascos</span>
          </button>

          <button 
             onClick={() => openNewLoss('quality')}
            className="flex flex-col items-center justify-center p-6 bg-white border-2 border-slate-200 rounded-xl hover:border-rose-500 hover:shadow-md transition-all group"
          >
            <div className="bg-rose-100 p-4 rounded-full text-rose-600 mb-3 group-hover:scale-110 transition-transform">
              <AlertTriangle size={32} />
            </div>
            <span className="font-bold text-slate-800 text-lg">Rechazos (Calidad)</span>
            <span className="text-sm text-slate-500">Defectos, descartes</span>
          </button>
        </div>

        {/* Recent Events Log */}
        <Card className="mt-8">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-bold text-slate-800">Eventos Registrados</h3>
          </div>
          <div className="p-0">
            {activeSession.losses.length === 0 ? (
              <p className="p-6 text-center text-slate-500">No hay pérdidas registradas en este turno.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {activeSession.losses.map((loss) => (
                  <li key={loss.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        loss.category === 'availability' ? 'bg-amber-100 text-amber-700' :
                        loss.category === 'performance' ? 'bg-purple-100 text-purple-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {loss.category === 'availability' ? <Pause size={18}/> : loss.category === 'performance' ? <AlertOctagon size={18}/> : <AlertTriangle size={18}/>}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{loss.cause}</p>
                        <p className="text-xs text-slate-500">{loss.time} {loss.comment && `- ${loss.comment}`}</p>
                        {loss.ticketCode && (
                          <p className="mt-1 inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                            <Wrench size={12} /> Ticket: {loss.ticketCode}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                      {loss.category === 'performance' ? <><p className="font-bold text-purple-700">{loss.speed} und/min</p><p className="text-sm text-slate-600">{(loss.duration / 60).toFixed(2)} h hasta {loss.speedEndTime}</p></> : loss.duration > 0 && <p className="font-bold text-slate-800">{loss.duration} min</p>}
                      {loss.qty > 0 && <p className="font-bold text-rose-600">{loss.qty} und</p>}
                      </div>
                      {role === 'responsible_operator' && <div className="flex gap-1"><button title="Editar evento" aria-label={`Editar ${loss.cause}`} onClick={() => openEditLoss(loss)} className="rounded-lg border border-blue-200 p-2 text-blue-600 hover:bg-blue-50"><Edit size={16}/></button><button title="Eliminar evento" aria-label={`Eliminar ${loss.cause}`} onClick={() => deleteLoss(loss)} className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={16}/></button></div>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white border-t border-slate-200 p-4 flex justify-between items-center z-40">
          <Button variant="ghost">Guardar Borrador</Button>
          <Button variant="primary" onClick={handleFinish} className="!px-8">
            <CheckCircle size={20} /> Finalizar y Enviar a Revisión
          </Button>
        </div>

        {/* Modals */}
        <Modal isOpen={supportModalOpen} onClose={() => setSupportModalOpen(false)} title="Registrar operarios de apoyo">
          <div className="space-y-5">
            <p className="text-sm text-slate-600">Selecciona uno o varios operarios de apoyo e indica cuántas horas participaron en el proceso.</p>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <label className="block text-sm font-semibold text-blue-900">Asignar las mismas horas a todos</label>
              <div className="mt-2 flex gap-2">
                <input type="number" min="0" step="0.25" placeholder="Horas" value={sharedSupportHours} onChange={(event) => setSharedSupportHours(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-blue-200 p-2" />
                <Button variant="secondary" className="!px-3 !py-2" disabled={!sharedSupportHours || supportDraft.length === 0} onClick={applySharedSupportHours}>Aplicar</Button>
              </div>
            </div>
            <div className="space-y-2">
              {supportOperators.map(operator => {
                const selected = supportDraft.find(item => item.id === operator.id);
                return (
                  <div key={operator.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                    <input aria-label={`Seleccionar ${operator.name}`} type="checkbox" checked={Boolean(selected)} onChange={() => toggleSupportOperator(operator)} className="h-4 w-4" />
                    <div className="min-w-0 flex-1"><p className="font-medium text-slate-800">{operator.name}</p><p className="text-xs text-slate-500">{operator.id}</p></div>
                    <input aria-label={`Horas de ${operator.name}`} type="number" min="0" step="0.25" placeholder="Horas" disabled={!selected} value={selected?.hours || ''} onChange={(event) => updateSupportHours(operator.id, event.target.value)} className="w-24 rounded-lg border border-slate-300 p-2 disabled:bg-slate-100" />
                  </div>
                );
              })}
            </div>
            <div className="rounded-lg border border-dashed border-blue-300 bg-blue-50 p-3"><label className="mb-2 block text-sm font-semibold text-blue-900">Añadir operario no registrado</label><div className="flex gap-2"><input className="min-w-0 flex-1 rounded-lg border border-blue-200 p-2" placeholder="Nombre completo" value={newSupportName} onChange={(event) => setNewSupportName(event.target.value)}/><Button variant="secondary" className="!px-3 !py-2" disabled={!newSupportName.trim()} onClick={addSupportOperator}><Plus size={16}/> Añadir</Button></div></div>
            <div className="flex gap-3"><Button variant="secondary" className="flex-1" onClick={() => setSupportModalOpen(false)}>Cancelar</Button><Button className="flex-1" disabled={supportDraft.some(item => !Number(item.hours))} onClick={saveSupportOperators}>Guardar todos ({supportDraft.length})</Button></div>
          </div>
        </Modal>

        <Modal isOpen={lossModalOpen} onClose={() => { setLossModalOpen(false); resetLossEditor(); }} title={`${editingLossId ? 'Editar' : 'Registrar'} ${lossType === 'availability' ? 'Pérdida de Disponibilidad' : lossType === 'performance' ? 'Rendimiento' : 'Pérdida de Calidad'}`}>
          <div className="space-y-4">
            {lossType !== 'performance' && <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Causa de la Pérdida</label>
              <select 
                className="w-full border-slate-300 rounded-lg shadow-sm p-3 border focus:border-blue-500 focus:ring-blue-500"
                value={lossForm.cause} onChange={(e) => {
                  setLossForm({...lossForm, cause: e.target.value});
                  setMaintenanceTicket(null);
                }}
              >
                <option value="">Seleccione una causa...</option>
                {LOSS_CAUSES[lossType].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>}
            
            {lossType === 'performance' && (
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm text-purple-900">
                <p className="font-semibold">Velocidad estándar definida: {activeSession.standardSpeed} und/min</p>
                <p className="mt-1 text-purple-700">La duración se calcula desde {performanceStartTime} hasta la hora final registrada.</p>
              </div>
            )}

            {lossType === 'performance' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Velocidad de la máquina (und/min)</label>
                <input
                  type="number" min="0" step="0.1" placeholder={`Estándar: ${activeSession.standardSpeed}`}
                  className="w-full border-slate-300 rounded-lg shadow-sm p-3 border focus:border-purple-500 focus:ring-purple-500 text-lg"
                  value={lossForm.speed} onChange={(e) => setLossForm({...lossForm, speed: e.target.value})}
                />
              </div>
            )}

            {lossType === 'performance' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hora de finalización de velocidad</label>
                <TimeField label="Hora y minuto final del tramo" value={lossForm.speedEndTime} onChange={(value) => setLossForm({...lossForm, speedEndTime: value})} />
                {lossForm.speedEndTime && <p className="mt-1 text-sm text-purple-700">Horas de velocidad: {(elapsedMinutes(performanceStartTime, lossForm.speedEndTime) / 60).toFixed(2)} h</p>}
              </div>
            )}

            {lossType === 'availability' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duración (minutos)</label>
                <input 
                  type="number" min="1"
                  className="w-full border-slate-300 rounded-lg shadow-sm p-3 border focus:border-blue-500 focus:ring-blue-500 text-lg"
                  value={lossForm.duration} onChange={(e) => setLossForm({...lossForm, duration: e.target.value})}
                />
              </div>
            )}

            {lossType === 'quality' && (
              <div>
                <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-amber-800 mb-1">Reproceso (und)</label><input type="number" min="0" className="w-full rounded-lg border border-amber-300 p-3 text-lg" value={lossForm.reprocessQty} onChange={(e) => setLossForm({...lossForm, reprocessQty: e.target.value})}/><p className="mt-1 text-xs text-slate-500">Puede volver a fabricarse.</p></div><div><label className="block text-sm font-medium text-rose-800 mb-1">Desperdicio (und)</label><input type="number" min="0" className="w-full rounded-lg border border-rose-300 p-3 text-lg" value={lossForm.wasteQty} onChange={(e) => setLossForm({...lossForm, wasteQty: e.target.value})}/><p className="mt-1 text-xs text-slate-500">Descarte definitivo.</p></div></div>
              </div>
            )}

            {requiresMaintenanceTicket && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex gap-3">
                  <Wrench className="shrink-0 text-amber-600" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-900 text-sm">La avería requiere un ticket de mantenimiento</p>
                    <p className="mt-1 text-xs text-amber-800">Completa el detalle técnico antes de registrar el evento.</p>
                    {maintenanceTicket ? (
                      <p className="mt-3 inline-flex rounded bg-white px-2 py-1 text-xs font-bold text-amber-800">
                        Ticket generado: {maintenanceTicket.code}
                      </p>
                    ) : (
                      <Button variant="secondary" className="!mt-3 !border-amber-300 !bg-white !text-amber-800" onClick={() => setTicketModalOpen(true)}>
                        <Wrench size={16} /> Ticketera de mantenimiento
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Comentario (Opcional)</label>
              <textarea 
                className="w-full border-slate-300 rounded-lg shadow-sm p-3 border focus:border-blue-500 focus:ring-blue-500" rows={3}
                value={lossForm.comment} onChange={(e) => setLossForm({...lossForm, comment: e.target.value})}
              ></textarea>
            </div>

            <Button 
              className="w-full !mt-6 !py-4 text-lg" 
              disabled={(lossType !== 'performance' && !lossForm.cause) || (lossType === 'availability' && !lossForm.duration) || (lossType === 'performance' && (!lossForm.speed || !lossForm.speedEndTime || elapsedMinutes(performanceStartTime, lossForm.speedEndTime) === 0)) || (lossType === 'quality' && (Number(lossForm.reprocessQty) + Number(lossForm.wasteQty) <= 0)) || (requiresMaintenanceTicket && !maintenanceTicket)}
              onClick={handleAddLoss}
            >
              {editingLossId ? 'Guardar cambios' : 'Registrar evento'}
            </Button>
          </div>
        </Modal>

        <Modal isOpen={ticketModalOpen} onClose={() => setTicketModalOpen(false)} title="Ticketera de mantenimiento">
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-800">{activeSession.machine}</p>
              <p className="mt-1 text-slate-500">{lossForm.cause} · OT {activeSession.id}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
              <select className="w-full rounded-lg border border-slate-300 p-3" value={ticketForm.priority} onChange={(e) => setTicketForm({...ticketForm, priority: e.target.value})}>
                <option>Alta</option>
                <option>Media</option>
                <option>Baja</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Detalle de la avería</label>
              <textarea className="w-full rounded-lg border border-slate-300 p-3" rows={4} placeholder="Describe el síntoma, componente afectado y condición de la máquina." value={ticketForm.detail} onChange={(e) => setTicketForm({...ticketForm, detail: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reportado por</label>
              <input className="w-full rounded-lg border border-slate-300 p-3" value={ticketForm.reportedBy} onChange={(e) => setTicketForm({...ticketForm, reportedBy: e.target.value})} />
            </div>
            <Button className="w-full !py-3" disabled={!ticketForm.detail.trim() || !ticketForm.reportedBy.trim()} onClick={handleCreateMaintenanceTicket}>
              <Wrench size={18} /> Generar ticket
            </Button>
          </div>
        </Modal>

        <Modal isOpen={qtyModalOpen} onClose={() => setQtyModalOpen(false)} title="Actualizar Cantidades">
           <div className="space-y-4">
             <div className="bg-slate-50 p-4 rounded-lg flex justify-between items-center mb-6 border border-slate-200">
               <span className="text-slate-600">Total Producido (Actual)</span>
               <span className="text-xl font-bold text-slate-800">{activeSession.realQty.toLocaleString()}</span>
             </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Total producido (Unidades)</label>
              <input 
                type="number" min="0" placeholder="Ej. 5000"
                className="w-full border-slate-300 rounded-lg shadow-sm p-4 border text-xl font-bold focus:border-blue-500 focus:ring-blue-500"
                value={qtyForm.produced} onChange={(e) => setQtyForm({...qtyForm, produced: e.target.value})}
              />
            </div>
            
            
            <Button 
              className="w-full !mt-6 !py-4 text-lg bg-emerald-600 hover:bg-emerald-700" 
              disabled={!qtyForm.produced}
              onClick={handleUpdateQty}
            >
              Actualizar Contadores
            </Button>
          </div>
        </Modal>
        <Modal isOpen={overweightModalOpen} onClose={() => setOverweightModalOpen(false)} title="Registrar sobrepeso">
          <div className="space-y-4"><p className="text-sm text-slate-600">Registra uno o varios pesos y la cantidad de productos correspondiente a cada medición.</p><div className="rounded-lg bg-cyan-50 p-3"><label className="text-sm font-semibold text-cyan-900">Peso objetivo / línea central (g)</label><input type="number" min="0" step="0.01" className="mt-1 w-full rounded border border-cyan-200 p-2" value={targetWeight} onChange={(event) => setTargetWeight(event.target.value)} placeholder="Ej. 250"/></div>{overweightDraft.map((item, index) => <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 rounded-lg border border-slate-200 p-3"><div><label className="text-xs font-semibold text-slate-600">Peso (g)</label><input type="number" min="0" step="0.01" className="mt-1 w-full rounded border border-slate-300 p-2" value={item.weight} onChange={(event) => setOverweightDraft(current => current.map((row, rowIndex) => rowIndex === index ? {...row, weight:event.target.value} : row))}/></div><div><label className="text-xs font-semibold text-slate-600">Cantidad</label><input type="number" min="1" className="mt-1 w-full rounded border border-slate-300 p-2" value={item.quantity} onChange={(event) => setOverweightDraft(current => current.map((row, rowIndex) => rowIndex === index ? {...row, quantity:event.target.value} : row))}/></div><button disabled={overweightDraft.length === 1} onClick={() => setOverweightDraft(current => current.filter((_, rowIndex) => rowIndex !== index))} className="rounded p-2 text-rose-600 disabled:opacity-30"><Trash2 size={18}/></button></div>)}<Button variant="secondary" className="w-full" onClick={() => setOverweightDraft(current => [...current, {weight:'',quantity:''}])}><Plus size={18}/> Agregar otro peso</Button><Button className="w-full" disabled={!overweightDraft.some(item => Number(item.weight)>0 && Number(item.quantity)>0)} onClick={saveOverweights}>Guardar sobrepesos</Button></div>
        </Modal>
        <Modal isOpen={materialModalOpen} onClose={() => setMaterialModalOpen(false)} title="Registrar descarte de material">
          <div className="space-y-4"><div><label className="mb-1 block text-sm font-semibold text-slate-700">Tipo de material</label><select className="w-full rounded-lg border border-slate-300 p-3" value={materialForm.type} onChange={(event) => setMaterialForm({...materialForm,type:event.target.value})}><option>Envasado</option><option>Acondicionado</option></select></div><div><label className="mb-1 block text-sm font-semibold text-slate-700">Material descartado</label><input className="w-full rounded-lg border border-slate-300 p-3" placeholder="Ej. blíster, frasco, caja..." value={materialForm.material} onChange={(event) => setMaterialForm({...materialForm,material:event.target.value})}/></div><div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-sm font-semibold text-slate-700">Cantidad</label><input type="number" min="0" className="w-full rounded-lg border border-slate-300 p-3" value={materialForm.quantity} onChange={(event) => setMaterialForm({...materialForm,quantity:event.target.value})}/></div><div><label className="mb-1 block text-sm font-semibold text-slate-700">Unidad</label><select className="w-full rounded-lg border border-slate-300 p-3" value={materialForm.unit} onChange={(event) => setMaterialForm({...materialForm,unit:event.target.value})}><option>unidades</option><option>kg</option><option>metros</option></select></div></div><textarea className="w-full rounded-lg border border-slate-300 p-3" placeholder="Comentario opcional" value={materialForm.comment} onChange={(event) => setMaterialForm({...materialForm,comment:event.target.value})}/><Button className="w-full" disabled={!materialForm.material.trim() || Number(materialForm.quantity)<=0} onClick={saveMaterialDiscard}>Guardar descarte</Button></div>
        </Modal>
      </div>
    );
  };

  const ValidationsView = () => {
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [observationModalOpen, setObservationModalOpen] = useState(false);
    const [observationComment, setObservationComment] = useState('');
    const reviewRecords = records.filter(record => record.status === 'review');
    const observedRecords = records.filter(record => record.status === 'observed');
    const validatedRecords = records.filter(record => record.status === 'validated');

    const observeRecord = () => {
      if (!observationComment.trim()) return;
      const meeting = { code: `REU-${Date.now().toString().slice(-6)}`, attendee: 'Juanito', date: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString() };
      setRecords(current => current.map(record => record.id === selectedRecord.id ? { ...record, status: 'observed', observationComment, correctionMeeting: meeting } : record));
      setWorkOrders(current => current.map(order => order.id === (selectedRecord.workOrderId || selectedRecord.id.replace(/^REC-/, '')) ? { ...order, status: 'observed' } : order));
      setObservationComment('');
      setObservationModalOpen(false);
      setSelectedRecord(null);
      alert(`OT observada. Se asignó la reunión ${meeting.code} con Juanito para el ${meeting.date}.`);
    };

    const approveRecord = () => {
      setRecords(current => current.map(record => record.id === selectedRecord.id ? { ...record, status: 'validated' } : record));
      setWorkOrders(current => current.map(order => order.id === (selectedRecord.workOrderId || selectedRecord.id.replace(/^REC-/, '')) ? { ...order, status: 'validated' } : order));
      setSelectedRecord(null);
    };

    const StatusList = ({ title, records: statusRecords, variant, emptyMessage, selectable = false }: { title: string; records: any[]; variant: BadgeVariant; emptyMessage: string; selectable?: boolean }) => (
      <Card>
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between"><h3 className="font-bold text-slate-800">{title}</h3><Badge variant={variant}>{statusRecords.length}</Badge></div>
        {statusRecords.length === 0 ? <p className="p-6 text-center text-slate-500">{emptyMessage}</p> : <ul className="divide-y divide-slate-100">{statusRecords.map(record => <li key={record.id} className="p-4 flex items-center justify-between"><div><p className="font-semibold text-slate-800">{record.workOrderId || record.id.replace(/^REC-/, '')}</p><p className="text-sm text-slate-500">{record.machine} · {record.operator}</p>{record.observationComment && <p className="mt-1 text-sm text-rose-700">Observación: {record.observationComment}</p>}</div>{selectable && <Button variant="secondary" className="!px-3 !py-2" onClick={() => setSelectedRecord(record)}><Eye size={16}/> {record.status === 'review' ? 'Revisar' : 'Ver'}</Button>}</li>)}</ul>}
      </Card>
    );

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-slate-800">Bandeja de Validaciones</h2>
        {selectedRecord ? (
          <Card>
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between bg-slate-50"><div className="flex items-center gap-4"><button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-slate-200 rounded-lg"><ArrowRight className="rotate-180" size={20} /></button><h3 className="text-lg font-bold">Detalle de OT: {selectedRecord.workOrderId || selectedRecord.id.replace(/^REC-/, '')}</h3></div><Badge variant={selectedRecord.status === 'validated' ? 'success' : 'warning'}>{WORK_ORDER_STATUS[selectedRecord.status]?.label || selectedRecord.status}</Badge></div>
            <div className="p-6 space-y-6"><div className="grid grid-cols-2 md:grid-cols-4 gap-6"><div><p className="text-sm text-slate-500">Operario responsable</p><p className="font-semibold">{selectedRecord.operator}</p></div><div><p className="text-sm text-slate-500">Máquina</p><p className="font-semibold">{selectedRecord.machine}</p></div><div><p className="text-sm text-slate-500">Producción</p><p className="font-semibold">{selectedRecord.realQty.toLocaleString()} und</p></div><div><p className="text-sm text-slate-500">OEE</p><p className="font-bold text-xl" style={{color: getOEEColor(selectedRecord.metrics.oee)}}>{selectedRecord.metrics.oee.toFixed(1)}%</p></div></div>
            <div><h4 className="font-bold text-slate-800 mb-3">Eventos registrados</h4>{selectedRecord.losses.length === 0 ? <p className="text-slate-500">No se registraron pérdidas.</p> : <div className="space-y-2">{selectedRecord.losses.map(loss => <div key={loss.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex justify-between"><span>{loss.cause}</span><span className="font-semibold">{loss.duration ? `${loss.duration} min` : `${loss.qty} und`}</span></div>)}</div>}</div>
            {selectedRecord.status === 'review' && <div className="flex gap-4 border-t pt-4"><Button variant="danger" className="flex-1" onClick={() => setObservationModalOpen(true)}><Edit size={18}/> Observado</Button><Button variant="success" className="flex-1" onClick={approveRecord}><CheckCircle size={18}/> Aprobar y validar</Button></div>}</div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><StatusList title="OT en revisión" records={reviewRecords} variant="warning" emptyMessage="No hay OT en revisión." selectable /><StatusList title="OT observadas" records={observedRecords} variant="critical" emptyMessage="No hay OT observadas." /><StatusList title="OT aprobadas" records={validatedRecords} variant="success" emptyMessage="No hay OT aprobadas." selectable /></div>
        )}
        <Modal isOpen={observationModalOpen} onClose={() => setObservationModalOpen(false)} title="Observar OT">
          <div className="space-y-4"><p className="text-sm text-slate-600">Indica el comentario que el operario responsable deberá revisar.</p><textarea className="w-full rounded-lg border border-slate-300 p-3" rows={4} placeholder="Describe la observación..." value={observationComment} onChange={(event) => setObservationComment(event.target.value)} /><Button variant="danger" className="w-full" disabled={!observationComment.trim()} onClick={observeRecord}><Edit size={18}/> Enviar observación</Button></div>
        </Modal>
      </div>
    );
  };

  const AIAssistantView = () => {
    const [messages, setMessages] = useState([
      { role: 'ai', text: 'Hola Carlos. Soy tu asistente experto en OEE. He analizado los datos del último mes de la Planta Norte. ¿En qué te puedo ayudar a profundizar hoy?' }
    ]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(() => { scrollToBottom(); }, [messages]);

    const handleSend = () => {
      if (!input.trim()) return;
      
      const newMessages = [...messages, { role: 'user', text: input }];
      setMessages(newMessages);
      setInput('');

      // Simulate AI response delay
      setTimeout(() => {
        let aiResponse = "He revisado la base de datos. ";
        const lowerInput = input.toLowerCase();
        
        if(lowerInput.includes('limpieza') || lowerInput.includes('pérdida')) {
          aiResponse += "El tiempo de limpieza profunda en la Blistera B-01 ha aumentado un 15% esta semana. Te sugiero revisar el nuevo procedimiento implementado el lunes.";
        } else if (lowerInput.includes('oee') || lowerInput.includes('tendencia')) {
          aiResponse += "La tendencia del OEE es positiva (subió de 74% a 76.4%), impulsada principalmente por una reducción en microparadas en la Línea de Empaque 1.";
        } else {
          aiResponse += "Las principales oportunidades de mejora actuales se concentran en reducir los tiempos de Cambio de Formato, que representan el 30% del tiempo total detenido histórico.";
        }

        setMessages([...newMessages, { role: 'ai', text: aiResponse }]);
      }, 1500);
    };

    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
        <div className="bg-slate-900 p-4 text-white flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-full"><Bot size={24} /></div>
          <div>
            <h2 className="font-bold">Asistente OEE Analítico</h2>
            <p className="text-xs text-blue-200">Impulsado por IA - Analizando históricos MES</p>
          </div>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl ${
                msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 shadow-sm rounded-tl-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-slate-200 flex gap-2">
          <input 
            type="text" 
            placeholder="Pregunta sobre causas, tendencias o máquinas..." 
            className="flex-1 border-slate-300 rounded-lg shadow-sm p-3 border focus:border-blue-500 focus:ring-blue-500"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button variant="primary" onClick={handleSend} className="!px-4">
            <Send size={20} />
          </Button>
        </div>
      </div>
    );
  };

  const AlertCircleIcon = () => <AlertTriangle size={18} />;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 z-50 shadow-xl`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950">
          {isSidebarOpen && <span className="font-bold text-lg text-white tracking-tight flex items-center gap-2"><BiomontLogo className="w-24 h-auto" /> <span>BIOEE</span></span>}
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-slate-800 rounded">
            {isSidebarOpen ? <X size={20} /> : <BiomontLogo className="w-10 h-auto" />}
          </button>
        </div>
        
        <div className="p-4 flex-1 space-y-2 overflow-y-auto">
          {role === 'supervisor' && <SidebarItem icon={LayoutDashboard} label="Dashboard" viewId="dashboard" />}
          <SidebarItem icon={ClipboardList} label="Órdenes (OT)" viewId="work_orders" />
          {role === 'supervisor' && <SidebarItem icon={CheckSquare} label="Validaciones" viewId="validations" />}
          {role === 'supervisor' && <SidebarItem icon={Bot} label="Asistente IA" viewId="ai" />}
        </div>

        <div className="p-4 border-t border-slate-800">
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors">
            <LogOut size={20} />
            {isSidebarOpen && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm z-40">
          <div className="flex items-center gap-4">
             {activeSession && (
               <Badge variant="warning" className="animate-pulse flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                 Producción Activa: {activeSession.id}
               </Badge>
             )}
          </div>
          <div className="flex items-center gap-6">
            <button className="relative text-slate-400 hover:text-slate-600">
              <Bell size={20} />
              {records.filter(r => r.status === 'review').length > 0 && role === 'supervisor' && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
              )}
            </button>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800">{currentUser.name}</p>
                <p className="text-xs text-slate-500">{role === 'supervisor' ? 'Supervisor Planta' : 'Operario responsable'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold border border-blue-200">
                {currentUser.name.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            {currentView === 'dashboard' && <DashboardView />}
            {currentView === 'work_orders' && <WorkOrdersView />}
            {currentView === 'active_production' && <ActiveProductionView />}
            {currentView === 'validations' && <ValidationsView />}
            {currentView === 'ai' && <AIAssistantView />}
          </div>
        </div>
      </main>
    </div>
  );
}

