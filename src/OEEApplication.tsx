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
const INITIAL_SUPPORT_OPERATORS = [
  { id: "OP-042", name: "Carlos Mendoza" },
  { id: "OP-051", name: "María Torres" },
  { id: "OP-063", name: "José Ramírez" },
  { id: "OP-078", name: "Lucía Flores" }
];
const PRODUCTION_LINE_OPERATORS = [
  { id: "OP-B01-001", name: "Omar Miraya", machines: ["Blistera B-01"] },
  { id: "OP-B01-002", name: "Aaron Flores", machines: ["Blistera B-01"] },
  { id: "OP-B01-003", name: "Josue Huapaya", machines: ["*"] }
];
const DEMO_CREDENTIALS = {
  supervisor: { username: "molin", password: "password", name: "Molin" },
  responsible_operator: { username: "Josue.Huapaya", password: "password", name: "Josue Huapaya", id: "OP-B01-003" }
};

const WORK_ORDER_STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  not_started: { label: 'Sin iniciar', variant: 'default' },
  in_progress: { label: 'En proceso', variant: 'success' },
  review: { label: 'En revisión', variant: 'warning' },
  observed: { label: 'Observado', variant: 'critical' },
  validated: { label: 'Validado', variant: 'success' }
};

const MACHINES = [
  { id: "B-01", name: "Blistera B-01", line: "Blistera", status: "available", standardSpeed: 100 },
  { id: "I-01", name: "Inyectora I-01", line: "Inyectora", status: "available", standardSpeed: 85 },
  { id: "T-01", name: "Tableteadora T-01", line: "Tableteadora", status: "available", standardSpeed: 110 },
  { id: "E-01", name: "Encapsuladora E-01", line: "Encapsuladora", status: "maintenance", standardSpeed: 120 },
  { id: "M-01", name: "Mezcladora M-01", line: "Mezcladora", status: "available", standardSpeed: 70 },
  { id: "L-02", name: "Llenadora L-02", line: "Llenadora", status: "occupied", standardSpeed: 80 },
  { id: "A-01", name: "Acondicionadora A-01", line: "Acondicionadora", status: "available", standardSpeed: 95 },
];

const LOSS_CAUSES = {
  planned_availability: ["Limpieza programada", "Cambio de formatos", "Mantenimiento preventivo", "Otros"],
  availability: ["Corte de servicios", "Avería mecánica", "Avería eléctrica", "Bloqueos", "Otros"],
  performance: ["Microparada de máquina", "Microparada de línea", "Atasco de material", "Ajuste menor", "Otros"],
  quality: ["Blister mal sellado", "Falta de lote/vencimiento", "Volumen incorrecto", "Contaminación cruzada"]
};
const CHART_DATA_TREND = [];
const CHART_DATA_PARETO = [];

const loadStoredCatalog = (key, fallback) => {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

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
  const baseStyle = "inline-flex items-center justify-center gap-2 px-6 py-ded-lg bg-slate-100"><div className="flex items-center justify-center bg-lime-500 px-2 text-sm font-bold text-lime-950" style={{width:`${boundedPercent(qualityRate)}%`}}>{goodProduction.toLocaleString()} buenas</div><div className="flex flex-1 items-center justify-center bg-rose-500 px-2 text-xs font-semibold text-white">Rechazos {Math.max(0,totalProduction-goodProduction).toLocaleString()}</div></div><div className="text-right"><p className="font-bold text-lime-700">{boundedPercent(qualityRate).toFixed(2)}%</p><p className="text-xs text-slate-500">Buenas / Total</p></div></div>
          </div></Card>
          <div className="grid gap-6 xl:grid-cols-3"><Card className="p-6 xl:col-span-2"><div className="mb-5"><h3 className="font-bold text-slate-800">Desempeño por máquina</h3><p className="text-sm text-slate-500">OEE promedio y minutos de detención acumulados.</p></div><div className="h-72"><ResponsiveContainer><ComposedChart data={machineOverviewData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="machine" tick={{fontSize:10}}/><YAxis yAxisId="left" domain={[0,100]} unit="%"/><YAxis yAxisId="right" orientation="right" unit=" min"/><RechartsTooltip/><Legend/><Bar yAxisId="left" dataKey="oee" name="OEE" fill={COLORS.primary} radius={[6,6,0,0]}/><Line yAxisId="right" dataKey="downtime" name="Detención" stroke={COLORS.critical} strokeWidth={3}/></ComposedChart></ResponsiveContainer></div></Card><Card className="p-6"><h3 className="font-bold text-slate-800">Estado de órdenes</h3><div className="mt-5 h-64"><ResponsiveContainer><PieChart><Pie data={orderStatusOverview} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={4}>{orderStatusOverview.map((_, index) => <Cell key={index} fill={[COLORS.primary,COLORS.success,COLORS.warning,COLORS.critical,'#8b5cf6'][index % 5]}/>)}</Pie><RechartsTooltip/><Legend/></PieChart></ResponsiveContainer></div></Card></div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="p-6"><h3 className="mb-5 font-bold text-slate-800">Pérdidas de disponibilidad reales</h3>{paretoData.length ? <div className="h-64"><ResponsiveContainer><BarChart data={paretoData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="cause" tick={{fontSize:10}}/><YAxis/><RechartsTooltip/><Bar dataKey="minutes" name="Minutos" fill={COLORS.critical}/></BarChart></ResponsiveContainer></div> : <p className="py-16 text-center text-slate-500">Sin pérdidas registradas.</p>}</Card>
            <Card className="p-6"><div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><h3 className="font-bold text-slate-800">Control de sobrepeso</h3><div><label className="mb-1 block text-xs font-semibold text-slate-500">Producto</label><select className="min-w-56 rounded-lg border border-slate-300 bg-white p-2" value={dashboardOverweightProduct} onChange={(event) => setDashboardOverweightProduct(event.target.value)}><option value="" disabled>Selecciona producto</option>{products.map(product => <option key={product}>{product}</option>)}</select></div></div>{overweightData.length ? <div className="h-64"><ResponsiveContainer><ScatterChart><CartesianGrid/><XAxis type="category" dataKey="sequence" name="Registro"/><YAxis type="number" dataKey="weight" name="Peso" unit=" g" domain={['auto','auto']}/><RechartsTooltip cursor={{strokeDasharray:'3 3'}}/><ReferenceLine y={centralWeight} stroke={COLORS.primary} strokeWidth={2} label="Promedio"/><Scatter data={overweightData} fill={COLORS.warning}/></ScatterChart></ResponsiveContainer></div> : <p className="py-16 text-center text-slate-500">{dashboardOverweightProduct ? 'Sin pesos registrados para el producto.' : 'Selecciona un producto para ver los datos.'}</p>}</Card>
          </div>
          <Card className="p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><h3 className="font-bold text-slate-800">Descarte de materiales para planificación</h3><div><label className="mb-1 block text-xs font-semibold text-slate-500">Producto</label><select className="min-w-56 rounded-lg border border-slate-300 bg-white p-2" value={dashboardDiscardProduct} onChange={(event) => setDashboardDiscardProduct(event.target.value)}><option value="" disabled>Selecciona producto</option>{products.map(product => <option key={product}>{product}</option>)}</select></div></div><div className="mt-4 grid gap-3 md:grid-cols-2">{Object.keys(materialSummary).length ? Object.entries(materialSummary).map(([key, quantity]) => { const [type, unit] = key.split('|'); return <div key={key} className="rounded-lg border border-slate-200 p-4"><p className="text-sm text-slate-500">Material de {type.toLowerCase()}</p><p className="text-2xl font-bold text-slate-800">{Number(quantity).toLocaleString()} <span className="text-sm font-medium">{unit}</span></p></div>; }) : <p className="text-slate-500">{dashboardDiscardProduct ? 'Sin descartes registrados para el producto.' : 'Selecciona un producto para ver los datos.'}</p>}</div></Card>
          <Card className="p-6"><div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><h3 className="font-bold text-slate-800">Horas de personal por línea y equipo</h3><p className="text-sm text-slate-500">Ranking de operarios ordenado de mayor a menor cantidad de horas.</p></div><div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-xs font-semibold text-slate-500">Línea</label><select className="min-w-56 rounded-lg border border-slate-300 bg-white p-2" value={dashboardLaborLine} onChange={(event) => { setDashboardLaborLine(event.target.value); setDashboardLaborEquipment(''); }}><option value="" disabled>Selecciona línea</option>{laborLines.map(line => <option key={line}>{line}</option>)}</select></div><div><label className="mb-1 block text-xs font-semibold text-slate-500">Equipo</label><select disabled={!dashboardLaborLine} className="min-w-56 rounded-lg border border-slate-300 bg-white p-2 disabled:bg-slate-100 disabled:text-slate-400" value={dashboardLaborEquipment} onChange={(event) => setDashboardLaborEquipment(event.target.value)}><option value="" disabled>Selecciona equipo</option>{laborEquipment.map(equipment => <option key={equipment}>{equipment}</option>)}</select></div></div></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-slate-500"><th className="p-2">Posición</th><th className="p-2">Personal</th><th className="p-2">Línea</th><th className="p-2">Equipo</th><th className="p-2">Participación</th><th className="p-2 text-right">Horas</th></tr></thead><tbody>{laborRanking.length ? laborRanking.map((item, index) => <tr key={item.worker} className="border-b border-slate-100"><td className="p-2"><span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{index + 1}</span></td><td className="p-2 font-medium">{item.worker}</td><td className="p-2">{item.line}</td><td className="p-2">{item.machine}</td><td className="p-2">{item.participations.join(', ')}</td><td className="p-2 text-right font-semibold">{item.hours.toFixed(2)} h</td></tr>) : <tr><td colSpan={6} className="p-8 text-center text-slate-500">{dashboardLaborLine && dashboardLaborEquipment ? 'Sin horas registradas para esta selección.' : 'Selecciona una línea y un equipo para ver el ranking.'}</td></tr>}</tbody></table></div></Card>
        </>}
      </div>
    );
  };

  const WorkOrdersView = () => {
    const activeStatuses = ['not_started', 'in_progress'];
    const normalized = (value) => String(value || '').toLowerCase();
    const visibleWorkOrders = workOrders.filter((order) => {
      if (!activeStatuses.includes(order.status)) return false;
      const operatorHasAccess = role === 'supervisor' || productionLineOperators.some(operator => operator.id === currentUser?.id && (operator.machines.includes('*') || operator.machines.some(machine => normalized(`${order.machine} ${order.line}`).includes(normalized(machine)))));
      if (!operatorHasAccess) return false;
      return normalized(order.id).includes(normalized(workOrderFilters.code))
        && normalized(order.lot).includes(normalized(workOrderFilters.lot))
        && normalized(order.product).includes(normalized(workOrderFilters.product))
        && normalized(`${order.line} ${order.machine}`).includes(normalized(workOrderFilters.line))
        && String(order.plannedQty).includes(workOrderFilters.quantity.replace(/[^0-9]/g, ''))
        && (!workOrderFilters.status || order.status === workOrderFilters.status)
        && normalized(order.registrar || 'Sin registrador').includes(normalized(workOrderFilters.registrar));
    });
    const updateFilter = (field, value) => setWorkOrderFilters(current => ({ ...current, [field]: value }));

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Órdenes de Trabajo</h2>
            <p className="text-slate-500">{role === 'supervisor' ? 'Carga y consulta las OT por lote, línea y registrador.' : 'Se muestran las OT disponibles para tu línea de producción.'}</p>
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
                  <th className="p-4 font-semibold">Lote</th><th className="p-4 font-semibold">Código OT</th><th className="p-4 font-semibold">Producto</th><th className="p-4 font-semibold">Línea/Máquina</th><th className="p-4 font-semibold">Planificado</th><th className="p-4 font-semibold">Vel. estándar</th><th className="p-4 font-semibold">Estado</th><th className="p-4 font-semibold">Registrador / Acción</th>
                </tr>
                  <tr className="border-b border-slate-200 bg-white">
                    <th className="p-2"><input className="w-full rounded border border-slate-300 p-2 text-xs" placeholder="Filtrar lote" value={workOrderFilters.lot} onChange={(e) => updateFilter('lot', e.target.value)} /></th>
                    <th className="p-2"><input className="w-full rounded border border-slate-300 p-2 text-xs" placeholder="Filtrar código" value={workOrderFilters.code} onChange={(e) => updateFilter('code', e.target.value)} /></th>
                    <th className="p-2"><input className="w-full rounded border border-slate-300 p-2 text-xs" placeholder="Filtrar producto" value={workOrderFilters.product} onChange={(e) => updateFilter('product', e.target.value)} /></th>
                    <th className="p-2"><input className="w-full rounded border border-slate-300 p-2 text-xs" placeholder="Filtrar línea o máquina" value={workOrderFilters.line} onChange={(e) => updateFilter('line', e.target.value)} /></th>
                    <th className="p-2"><input className="w-full rounded border border-slate-300 p-2 text-xs" placeholder="Filtrar cantidad" value={workOrderFilters.quantity} onChange={(e) => updateFilter('quantity', e.target.value)} /></th>
                    <th className="p-2"></th>
                    <th className="p-2"><select className="w-full rounded border border-slate-300 p-2 text-xs" value={workOrderFilters.status} onChange={(e) => updateFilter('status', e.target.value)}><option value="">Todos</option>{activeStatuses.map(status => <option key={status} value={status}>{WORK_ORDER_STATUS[status].label}</option>)}</select></th>
                    <th className="p-2"><select className="w-full rounded border border-slate-300 p-2 text-xs" value={workOrderFilters.registrar} onChange={(e) => updateFilter('registrar', e.target.value)}><option value="">Todos</option><option value="Sin registrador">Sin registrador</option>{productionLineOperators.map(operator => <option key={operator.id} value={operator.name}>{operator.name}</option>)}</select></th>
                  </tr>
              </thead>
              <tbody>
                {visibleWorkOrders.map((ot) => (
                  <tr key={ot.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-4 font-semibold text-blue-700">{ot.lot}</td><td className="p-4 font-medium text-slate-800">{ot.id}</td><td className="p-4 text-slate-600">{ot.product}</td>
                    <td className="p-4"><div className="text-sm text-slate-800">{ot.line}</div><div className="text-xs text-slate-500">{ot.machine}</div></td>
                    <td className="p-4 text-slate-600">{ot.plannedQty.toLocaleString()} und</td>
                    <td className="p-4 font-semibold text-purple-700">{Number(ot.standardSpeed || 0).toLocaleString()} und/min</td>
                    <td className="p-4"><Badge variant={WORK_ORDER_STATUS[ot.status].variant}>{WORK_ORDER_STATUS[ot.status].label}</Badge></td>
                    <td className="p-4">
                      {role === 'supervisor' ? (
                        <div className="flex min-w-48 items-center gap-2"><span className="flex-1 text-sm font-medium text-slate-700">{ot.registrar || 'Sin registrador'}</span>{ot.status === 'in_progress' && <button title="Ver OEE en tiempo real" onClick={() => setSelectedLiveOrder(activeSession?.id === ot.id ? activeSession : ot)} className="rounded-lg border border-blue-200 p-2 text-blue-600 hover:bg-blue-50"><Eye size={18}/></button>}</div>
                      ) : (
                         <Button variant="primary" className="!px-4 !py-2 text-sm" disabled={ot.status === 'in_progress' && ot.registrar !== currentUser.name} onClick={() => {
                           setActiveSession(current => current?.id === ot.id ? current : {...ot, operator: currentUser.name, registrar: currentUser.name, shift: SHIFTS[0], realQty: 0, goodQty: 0, rejectQty: 0, reprocessQty: 0, wasteQty: 0, productionRegistered: false, losses: [], supportOperators: [], overweights: ot.overweights || [], materialDiscards: ot.materialDiscards || [], targetWeight: ot.targetWeight || '', standardSpeed: Number(ot.standardSpeed) || plantEquipment.find(machine => machine.name === ot.machine || machine.id === ot.machine)?.standardSpeed || 0, processStart: '00:00', processEnd: '00:00', performanceEndTime: ''});
                          setWorkOrders(current => current.map(order => order.id === ot.id ? { ...order, status: 'in_progress', registrar: currentUser.name } : order));
                          setCurrentView('active_production');
                        }}>{ot.status === 'in_progress' ? 'Continuar OEE' : 'Registrar OEE'} <ArrowRight size={16} /></Button>
                      )}
                    </td>
                  </tr>
                ))}
                {visibleWorkOrders.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-slate-500">No hay OT disponibles para los filtros o tu línea de producción.</td></tr>}
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
    
    const [ticketModalOpen, setTicketModalOpen] = useState(false);
    const [maintenanceTicket, setMaintenanceTicket] = useState(null);
    const [ticketForm, setTicketForm] = useState({ priority: 'Media', detail: '', reportedBy: DUMMY_USER.name });
    const [supportModalOpen, setSupportModalOpen] = useState(false);
    const [sharedSupportHours, setSharedSupportHours] = useState('');
    const [supportOperators, setSupportOperators] = useState(INITIAL_SUPPORT_OPERATORS);
    const [supportDraft, setSupportDraft] = useState([]);
    const [plannedSupportDraft, setPlannedSupportDraft] = useState([]);
    const [newSupportName, setNewSupportName] = useState('');
    const [supportSearch, setSupportSearch] = useState('');
    const [overweightModalOpen, setOverweightModalOpen] = useState(false);
    const [overweightDraft, setOverweightDraft] = useState([{ sampleSize: '', weights: [''] }]);
    const [targetWeight, setTargetWeight] = useState('');
    const [materialModalOpen, setMaterialModalOpen] = useState(false);
    const [materialForm, setMaterialForm] = useState({ type: 'Envasado', material: '', quantity: '', unit: 'unidades', comment: '' });

    if (!activeSession) return <div>No hay sesión activa.</div>;

    const metrics = calculateSessionMetrics(activeSession);
    const supportCandidates = [...productionLineOperators, ...supportOperators].filter((operator, index, list) => list.findIndex(item => item.id === operator.id) === index);
    const filteredSupportOperators = supportCandidates.filter(operator => `${operator.name} ${operator.id}`.toLowerCase().includes(supportSearch.trim().toLowerCase()));
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
      setPlannedSupportDraft([]);
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
      setPlannedSupportDraft((loss.supportOperators || []).map(operator => ({ ...operator })));
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

    const togglePlannedSupportOperator = (operator) => {
      setPlannedSupportDraft(current => current.some(item => item.id === operator.id) ? current.filter(item => item.id !== operator.id) : [...current, { ...operator, hours: '' }]);
    };

    const updatePlannedSupportHours = (operatorId, hours) => {
      setPlannedSupportDraft(current => current.map(item => item.id === operatorId ? { ...item, hours } : item));
    };

    const handleCreateMaintenanceTicket = () => {
      const date = new Date();
      const ticketCode = `MT-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(Date.now()).slice(-5)}`;
      setMaintenanceTicket({
        code: ticketCode,
        equipment: activeSession.machine,
        cause: lossForm.cause,
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
        supportOperators: lossType === 'planned_availability' ? plannedSupportDraft : [],
        time: new Date().toLocaleTimeString()
      };
      
      const nextLosses = editingLossId
        ? activeSession.losses.map(loss => loss.id === editingLossId ? { ...newLoss, id: editingLossId, time: loss.time } : loss)
        : [...activeSession.losses, newLoss];
      setActiveSession(normalizeLosses(activeSession, nextLosses));
      
      setLossModalOpen(false);
      resetLossEditor();
    };

    const updateSampleSize = (sampleIndex, value) => {
      const sampleSize = Math.max(0, Math.min(100, parseInt(value) || 0));
      setOverweightDraft(current => current.map((sample, index) => index === sampleIndex ? {
        ...sample,
        sampleSize: value,
        weights: Array.from({ length: sampleSize }, (_, weightIndex) => sample.weights[weightIndex] || '')
      } : sample));
    };

    const updateSampleWeight = (sampleIndex, weightIndex, value) => {
      setOverweightDraft(current => current.map((sample, index) => index === sampleIndex ? {
        ...sample,
        weights: sample.weights.map((weight, index) => index === weightIndex ? value : weight)
      } : sample));
    };

    const validOverweightSamples = overweightDraft.length > 0 && overweightDraft.every(sample => Number(sample.sampleSize) > 0 && sample.weights.length === Number(sample.sampleSize) && sample.weights.every(weight => Number(weight) > 0));

    const saveOverweights = () => {
      if (!validOverweightSamples) return;
      const validRows = overweightDraft.flatMap((sample, sampleIndex) => sample.weights.map((weight, weightIndex) => ({ id: Date.now() + Math.random(), sampleId: `M-${Date.now()}-${sampleIndex + 1}`, sampleSize: Number(sample.sampleSize), measurement: weightIndex + 1, weight: Number(weight), quantity: 1 })));
      if (!validRows.length) return;
      setActiveSession(current => ({ ...current, targetWeight: Number(targetWeight) || current.targetWeight, overweights: [...(current.overweights || []), ...validRows] }));
      setOverweightDraft([{ sampleSize: '', weights: [''] }]);
      setOverweightModalOpen(false);
    };

    const saveMaterialDiscard = () => {
      if (!materialForm.material.trim() || Number(materialForm.quantity) <= 0) return;
      setActiveSession(current => ({ ...current, materialDiscards: [...(current.materialDiscards || []), { ...materialForm, id: Date.now(), quantity: Number(materialForm.quantity) }] }));
      setMaterialForm({ type: 'Envasado', material: '', quantity: '', unit: 'unidades', comment: '' });
      setMaterialModalOpen(false);
    };

    const handleFinish = () => {
      const linkedOrder = workOrders.find(order => order.id === activeSession.id);
      const mergeById = (sessionItems = [], orderItems = []) => Array.from(new Map([...sessionItems, ...orderItems].map(item => [item.id, item])).values());
      const recordToSave = {
        ...activeSession,
        targetWeight: activeSession.targetWeight || linkedOrder?.targetWeight,
        overweights: mergeById(activeSession.overweights, linkedOrder?.overweights),
        materialDiscards: mergeById(activeSession.materialDiscards, linkedOrder?.materialDiscards),
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
              <p className="font-semibold">{activeSession.operator}</p>
              <p className="text-xs text-slate-400">{activeSession.supportOperators.length} apoyo(s)</p>
            </div>
            <div className="text-center">
              <div className="flex items-end gap-2"><TimeField label="Inicio del proceso" value={activeSession.processStart} onChange={(value) => updateProcessTime('processStart', value)}/><span className="pb-3 text-slate-400">a</span><TimeField label="Fin del proceso" value={activeSession.processEnd} onChange={(value) => updateProcessTime('processEnd', value)}/></div>
            </div>
            <div className="text-center hidden md:block">
              <p className="text-slate-400">Planificado</p>
              <p className="font-semibold">{activeSession.plannedQty.toLocaleString()} und</p>
            </div>
            <div className="min-w-36"><label className="mb-1 block text-xs font-medium text-slate-400">Producción (und)</label><input type="number" min="0" className="w-36 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-right font-bold text-white outline-none focus:border-blue-400" value={activeSession.realQty || ''} onChange={(event) => { const produced = Math.max(0, Number(event.target.value) || 0); setActiveSession(current => ({ ...current, realQty: produced, goodQty: Math.max(0, produced - Number(current.rejectQty || 0)), productionRegistered: produced > 0 })); }} placeholder="0"/></div>
          </div>
        </div>

        {/* Real-time KPI Dashboard */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <Card className="p-4 border-l-4 border-l-blue-500 bg-blue-50/50">
            <p className="text-sm font-medium text-slate-600">OEE Calculado</p>
            <h3 className="text-3xl font-bold" style={{color: getOEEColor(metrics.oee)}}>{metrics.oee.toFixed(2)}%</h3>
          </Card>
          <Card className="p-4 border-l-4 border-l-amber-500">
            <p className="text-sm font-medium text-slate-600">Disponibilidad</p>
            <h3 className="text-2xl font-bold text-slate-800">{metrics.a.toFixed(2)}%</h3>
            <p className="text-xs text-rose-500 mt-1">{metrics.availLoss} min perdidos</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-purple-500">
            <p className="text-sm font-medium text-slate-600">Velocidad de equipo</p>
            <h3 className="text-2xl font-bold text-slate-800">{metrics.p.toFixed(2)}%</h3>
            <p className="text-xs text-purple-600 mt-1">{metrics.effectiveSpeed.toFixed(2)} / {metrics.standardSpeed} und/min</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-emerald-500">
            <p className="text-sm font-medium text-slate-600">Calidad</p>
            <h3 className="text-2xl font-bold text-slate-800">{metrics.q.toFixed(2)}%</h3>
            <p className="text-xs text-emerald-600 mt-1">{activeSession.goodQty} und buenas</p>
          </Card>
          <Card className="border-l-4 border-l-slate-500 p-4"><p className="text-sm font-medium text-slate-600">TNI automático</p><h3 className="text-2xl font-bold text-slate-800">{Number(metrics.tni || 0).toFixed(2)} min</h3><p className="mt-1 text-xs text-slate-500">Detenciones planificadas excluidas</p></Card>
        </div>

        {/* Ordered factor registration panel */}
        <div className="mt-8 mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold text-slate-800">Panel de Registro</h3><Button variant="secondary" className="!py-2" onClick={openSupportModal}><Users size={18}/> Personal de apoyo ({activeSession.supportOperators.length})</Button></div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <button onClick={() => openNewLoss('planned_availability')} className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-6 transition-all hover:border-sky-500 hover:shadow-md"><div className="mb-3 rounded-full bg-sky-100 p-4 text-sky-700"><CheckSquare size={32}/></div><span className="text-lg font-bold text-slate-800">Detenciones planificadas</span><span className="text-sm text-slate-500">Set up, limpieza y mantenimiento</span></button>
          <button onClick={() => { setTargetWeight(String(activeSession.targetWeight || '')); setOverweightModalOpen(true); }} className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-6 transition-all hover:border-cyan-500 hover:shadow-md"><div className="mb-3 rounded-full bg-cyan-100 p-4 text-cyan-700"><Scale size={32}/></div><span className="text-lg font-bold text-slate-800">Sobrepesos</span><span className="text-sm text-slate-500">{(activeSession.overweights || []).length} medición(es)</span></button>
          <button onClick={() => setMaterialModalOpen(true)} className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-6 transition-all hover:border-orange-500 hover:shadow-md"><div className="mb-3 rounded-full bg-orange-100 p-4 text-orange-700"><PackageMinus size={32}/></div><span className="text-lg font-bold text-slate-800">Descarte</span><span className="text-sm text-slate-500">{(activeSession.materialDiscards || []).length} registro(s)</span></button>
          <button onClick={() => openNewLoss('availability')} className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-6 transition-all hover:border-amber-500 hover:shadow-md"><div className="mb-3 rounded-full bg-amber-100 p-4 text-amber-600"><Pause size={32}/></div><span className="text-lg font-bold text-slate-800">Detenciones no planificadas</span><span className="text-sm text-slate-500">Averías, bloqueos y servicios</span></button>
          <button onClick={() => openNewLoss('quality')} className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-6 transition-all hover:border-rose-500 hover:shadow-md"><div className="mb-3 rounded-full bg-rose-100 p-4 text-rose-600"><AlertTriangle size={32}/></div><span className="text-lg font-bold text-slate-800">Rechazos</span><span className="text-sm text-slate-500">Reproceso y desperdicio</span></button>
          <button onClick={() => openNewLoss('performance')} className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-6 transition-all hover:border-purple-500 hover:shadow-md"><div className="mb-3 rounded-full bg-purple-100 p-4 text-purple-600"><AlertOctagon size={32}/></div><span className="text-lg font-bold text-slate-800">Velocidad de equipo</span><span className="text-sm text-slate-500">Registro de velocidad hasta la hora indicada</span></button>
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
                        loss.category === 'planned_availability' ? 'bg-sky-100 text-sky-700' :
                        loss.category === 'availability' ? 'bg-amber-100 text-amber-700' :
                        loss.category === 'performance' ? 'bg-purple-100 text-purple-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {loss.category === 'planned_availability' ? <CheckSquare size={18}/> : loss.category === 'availability' ? <Pause size={18}/> : loss.category === 'performance' ? <AlertOctagon size={18}/> : <AlertTriangle size={18}/>}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{loss.cause}</p>
                        <p className="text-xs text-slate-500">{loss.time} {loss.comment && `- ${loss.comment}`}</p>
                        {loss.category === 'planned_availability' && loss.supportOperators?.length > 0 && <p className="mt-1 text-xs font-medium text-sky-700">Apoyo: {loss.supportOperators.map(operator => `${operator.name} (${operator.hours} h)`).join(', ')}</p>}
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
        <Modal isOpen={supportModalOpen} onClose={() => setSupportModalOpen(false)} title="Personal de apoyo">
          <div className="space-y-5">
            <p className="text-sm text-slate-600">Registra o actualiza en cualquier momento a los operarios que apoyaron durante el proceso OEE.</p>
            <div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={18}/><input value={supportSearch} onChange={(event) => setSupportSearch(event.target.value)} className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3" placeholder="Buscar por nombre o código..."/></div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <label className="block text-sm font-semibold text-blue-900">Asignar las mismas horas a todos</label>
              <div className="mt-2 flex gap-2">
                <input type="number" min="0" step="0.25" placeholder="Horas" value={sharedSupportHours} onChange={(event) => setSharedSupportHours(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-blue-200 p-2" />
                <Button variant="secondary" className="!px-3 !py-2" disabled={!sharedSupportHours || supportDraft.length === 0} onClick={applySharedSupportHours}>Aplicar</Button>
              </div>
            </div>
            <div className="space-y-2">
              {filteredSupportOperators.map(operator => {
                const selected = supportDraft.find(item => item.id === operator.id);
                return (
                  <div key={operator.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                    <input aria-label={`Seleccionar ${operator.name}`} type="checkbox" checked={Boolean(selected)} onChange={() => toggleSupportOperator(operator)} className="h-4 w-4" />
                    <div className="min-w-0 flex-1"><p className="font-medium text-slate-800">{operator.name}</p><p className="text-xs text-slate-500">{operator.id}</p></div>
                    <input aria-label={`Horas de ${operator.name}`} type="number" min="0" step="0.25" placeholder="Horas" disabled={!selected} value={selected?.hours || ''} onChange={(event) => updateSupportHours(operator.id, event.target.value)} className="w-24 rounded-lg border border-slate-300 p-2 disabled:bg-slate-100" />
                  </div>
                );
              })}
              {filteredSupportOperators.length === 0 && <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">No se encontraron operarios.</p>}
            </div>
            <div className="rounded-lg border border-dashed border-blue-300 bg-blue-50 p-3"><label className="mb-2 block text-sm font-semibold text-blue-900">Añadir operario no registrado</label><div className="flex gap-2"><input className="min-w-0 flex-1 rounded-lg border border-blue-200 p-2" placeholder="Nombre completo" value={newSupportName} onChange={(event) => setNewSupportName(event.target.value)}/><Button variant="secondary" className="!px-3 !py-2" disabled={!newSupportName.trim()} onClick={addSupportOperator}><Plus size={16}/> Añadir</Button></div></div>
            <div className="flex gap-3"><Button variant="secondary" className="flex-1" onClick={() => setSupportModalOpen(false)}>Cancelar</Button><Button className="flex-1" disabled={supportDraft.some(item => !Number(item.hours))} onClick={saveSupportOperators}>Guardar personal ({supportDraft.length})</Button></div>
          </div>
        </Modal>

        <Modal isOpen={lossModalOpen} onClose={() => { setLossModalOpen(false); resetLossEditor(); }} title={`${editingLossId ? 'Editar' : 'Registrar'} ${lossType === 'planned_availability' ? 'Detención planificada - Disponibilidad' : lossType === 'availability' ? 'Detención no planificada - Disponibilidad' : lossType === 'performance' ? 'Pérdida de velocidad' : 'Rechazos'}`}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{lossType === 'quality' ? 'Tipo de rechazo' : 'Causa'}</label>
              <select 
                className="w-full border-slate-300 rounded-lg shadow-sm p-3 border focus:border-blue-500 focus:ring-blue-500"
                value={lossForm.cause} onChange={(e) => {
                  setLossForm({...lossForm, cause: e.target.value});
                  setMaintenanceTicket(null);
                }}
              >
                <option value="">Seleccione una causa...</option>
                {lossCauses[lossType].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
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

            {(lossType === 'availability' || lossType === 'planned_availability') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duración (minutos)</label>
                <input 
                  type="number" min="1"
                  className="w-full border-slate-300 rounded-lg shadow-sm p-3 border focus:border-blue-500 focus:ring-blue-500 text-lg"
                  value={lossForm.duration} onChange={(e) => setLossForm({...lossForm, duration: e.target.value})}
                />
              </div>
            )}

            {lossType === 'planned_availability' && (
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
                <p className="font-semibold text-sky-900">Operarios que apoyaron en la detención</p>
                <p className="mb-3 text-xs text-sky-700">Selecciona el personal que participó en el set up, limpieza u otra actividad planificada.</p>
                <div className="max-h-52 space-y-2 overflow-y-auto">{supportCandidates.map(operator => { const selected = plannedSupportDraft.find(item => item.id === operator.id); return <div key={operator.id} className="flex items-center gap-2 rounded border border-sky-100 bg-white p-2"><input type="checkbox" checked={Boolean(selected)} onChange={() => togglePlannedSupportOperator(operator)} aria-label={`Seleccionar ${operator.name}`}/><span className="min-w-0 flex-1 text-sm font-medium">{operator.name}</span><input type="number" min="0" step="0.25" disabled={!selected} value={selected?.hours || ''} onChange={(event) => updatePlannedSupportHours(operator.id, event.target.value)} placeholder="Horas" className="w-24 rounded border border-slate-300 p-2 text-sm disabled:bg-slate-100"/></div>; })}</div>
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
              disabled={!lossForm.cause || ((lossType === 'availability' || lossType === 'planned_availability') && !lossForm.duration) || (lossType === 'planned_availability' && plannedSupportDraft.some(operator => !Number(operator.hours))) || (lossType === 'performance' && (!lossForm.speed || !lossForm.speedEndTime || elapsedMinutes(performanceStartTime, lossForm.speedEndTime) === 0)) || (lossType === 'quality' && (Number(lossForm.reprocessQty) + Number(lossForm.wasteQty) <= 0)) || (requiresMaintenanceTicket && !maintenanceTicket)}
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

        <Modal isOpen={overweightModalOpen} onClose={() => setOverweightModalOpen(false)} title="Registrar sobrepeso">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Indica la cantidad muestreada y registra el peso individual de cada unidad medida.</p>
            <div className="rounded-lg bg-cyan-50 p-3"><label className="text-sm font-semibold text-cyan-900">Peso objetivo / línea central (g)</label><input type="number" min="0" step="0.01" className="mt-1 w-full rounded border border-cyan-200 p-2" value={targetWeight} onChange={(event) => setTargetWeight(event.target.value)} placeholder="Ej. 250"/></div>
            {overweightDraft.map((sample, sampleIndex) => <div key={sampleIndex} className="space-y-3 rounded-lg border border-slate-200 p-4">
              <div className="flex items-end gap-2"><div className="flex-1"><label className="text-sm font-semibold text-slate-700">Cantidad muestreada</label><input type="number" min="1" max="100" className="mt-1 w-full rounded border border-slate-300 p-2" value={sample.sampleSize} onChange={(event) => updateSampleSize(sampleIndex, event.target.value)} placeholder="Ej. 5"/></div><button aria-label={`Eliminar muestreo ${sampleIndex + 1}`} disabled={overweightDraft.length === 1} onClick={() => setOverweightDraft(current => current.filter((_, index) => index !== sampleIndex))} className="rounded p-2 text-rose-600 disabled:opacity-30"><Trash2 size={18}/></button></div>
              {sample.weights.length > 0 && Number(sample.sampleSize) > 0 && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{sample.weights.map((weight, weightIndex) => <div key={weightIndex}><label className="text-xs font-semibold text-slate-500">Peso {weightIndex + 1} (g)</label><input type="number" min="0" step="0.01" className="mt-1 w-full rounded border border-slate-300 p-2" value={weight} onChange={(event) => updateSampleWeight(sampleIndex, weightIndex, event.target.value)}/></div>)}</div>}
            </div>)}
            <Button variant="secondary" className="w-full" onClick={() => setOverweightDraft(current => [...current, {sampleSize:'',weights:['']}])}><Plus size={18}/> Agregar otro muestreo</Button>
            <Button className="w-full" disabled={!validOverweightSamples} onClick={saveOverweights}>Guardar muestreos</Button>
          </div>
        </Modal>
        <Modal isOpen={materialModalOpen} onClose={() => setMaterialModalOpen(false)} title="Registrar descarte de material">
          <div className="space-y-4"><div><label className="mb-1 block text-sm font-semibold text-slate-700">Tipo de material</label><select className="w-full rounded-lg border border-slate-300 p-3" value={materialForm.type} onChange={(event) => setMaterialForm({...materialForm,type:event.target.value})}><option>Envasado</option><option>Acondicionado</option><option>Materia prima</option><option>Producto terminado</option></select></div><div><label className="mb-1 block text-sm font-semibold text-slate-700">Material descartado</label><input className="w-full rounded-lg border border-slate-300 p-3" placeholder="Ej. blíster, frasco, caja..." value={materialForm.material} onChange={(event) => setMaterialForm({...materialForm,material:event.target.value})}/></div><div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-sm font-semibold text-slate-700">Cantidad</label><input type="number" min="0" className="w-full rounded-lg border border-slate-300 p-3" value={materialForm.quantity} onChange={(event) => setMaterialForm({...materialForm,quantity:event.target.value})}/></div><div><label className="mb-1 block text-sm font-semibold text-slate-700">Unidad</label><select className="w-full rounded-lg border border-slate-300 p-3" value={materialForm.unit} onChange={(event) => setMaterialForm({...materialForm,unit:event.target.value})}><option>unidades</option><option>kg</option><option>metros</option></select></div></div><textarea className="w-full rounded-lg border border-slate-300 p-3" placeholder="Comentario opcional" value={materialForm.comment} onChange={(event) => setMaterialForm({...materialForm,comment:event.target.value})}/><Button className="w-full" disabled={!materialForm.material.trim() || Number(materialForm.quantity)<=0} onClick={saveMaterialDiscard}>Guardar descarte</Button></div>
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
      const meeting = { code: `REU-${Date.now().toString().slice(-6)}`, attendee: selectedRecord.operator, date: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString() };
      setRecords(current => current.map(record => record.id === selectedRecord.id ? { ...record, status: 'observed', observationComment, correctionMeeting: meeting } : record));
      setWorkOrders(current => current.map(order => order.id === (selectedRecord.workOrderId || selectedRecord.id.replace(/^REC-/, '')) ? { ...order, status: 'observed' } : order));
      setObservationComment('');
      setObservationModalOpen(false);
      setSelectedRecord(null);
      alert(`OT observada. Se asignó la reunión ${meeting.code} con ${meeting.attendee} para el ${meeting.date}.`);
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
            <div className="p-6 space-y-6"><div className="grid grid-cols-2 md:grid-cols-5 gap-6"><div><p className="text-sm text-slate-500">Registrador</p><p className="font-semibold">{selectedRecord.registrar || selectedRecord.operator}</p></div><div><p className="text-sm text-slate-500">Máquina</p><p className="font-semibold">{selectedRecord.machine}</p></div><div><p className="text-sm text-slate-500">Producción</p><p className="font-semibold">{selectedRecord.realQty.toLocaleString()} und</p></div><div><p className="text-sm text-slate-500">OEE</p><p className="font-bold text-xl" style={{color: getOEEColor(calculateSessionMetrics(selectedRecord).oee)}}>{calculateSessionMetrics(selectedRecord).oee.toFixed(2)}%</p></div><div><p className="text-sm text-slate-500">TNI</p><p className="font-bold text-xl">{Number(calculateSessionMetrics(selectedRecord).tni || 0).toFixed(2)} min</p></div></div>
            <div><h4 className="font-bold text-slate-800 mb-3">Eventos registrados</h4>{selectedRecord.losses.length === 0 ? <p className="text-slate-500">No se registraron pérdidas.</p> : <div className="space-y-2">{selectedRecord.losses.map(loss => <div key={loss.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="flex justify-between"><span>{loss.cause}</span><span className="font-semibold">{loss.duration ? `${loss.duration} min` : `${loss.qty} und`}</span></div>{(loss.ticketCode || loss.ticket) && <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm"><p className="font-bold text-amber-900">Ticket {loss.ticketCode || loss.ticket?.code}</p><p className="text-amber-800">Prioridad: {loss.ticket?.priority || 'No indicada'}</p><p className="text-slate-600">{loss.ticket?.detail || loss.comment || 'Sin detalle adicional'}</p><p className="text-xs text-slate-500">Reportado por: {loss.ticket?.reportedBy || selectedRecord.operator || 'Sin dato'}</p></div>}</div>)}</div>}</div>
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

  const AdministrationView = () => {
    const categoryLabels = { planned_availability: 'Detenciones planificadas', availability: 'Detenciones no planificadas', performance: 'Velocidad de equipo', quality: 'Rechazos de calidad' };
    const productionMachines = Array.from(new Set(plantEquipment.map(machine => machine.name).filter(Boolean))) as string[];
    const addCause = () => {
      const cause = adminNewCause.trim();
      if (!cause || lossCauses[adminLossCategory].some(item => item.toLowerCase() === cause.toLowerCase())) return;
      setLossCauses(current => ({ ...current, [adminLossCategory]: [...current[adminLossCategory], cause] }));
      setAdminNewCause('');
    };
    const renameCause = (category, cause) => {
      const next = window.prompt('Nuevo nombre del motivo:', cause)?.trim();
      if (!next || next === cause) return;
      setLossCauses(current => ({ ...current, [category]: current[category].map(item => item === cause ? next : item) }));
    };
    const removeCause = (category, cause) => {
      if (!window.confirm(`¿Quitar el motivo "${cause}" del listado?`)) return;
      setLossCauses(current => ({ ...current, [category]: current[category].filter(item => item !== cause) }));
    };
    const saveOperator = () => {
      const name = adminOperatorForm.name.trim();
      const machines = adminOperatorForm.machines;
      if (!name || !machines.length) return;
      setProductionLineOperators(current => adminEditingOperatorId
        ? current.map(item => item.id === adminEditingOperatorId ? { ...item, name, machines } : item)
        : [...current, { id: `OP-${Date.now().toString().slice(-6)}`, name, machines }]);
      setAdminOperatorForm({ name: '', machines: [] });
      setAdminEditingOperatorId('');
    };
    const editOperator = (operator) => {
      const machines = (operator.machines.includes('*') ? ['*'] : Array.from(new Set(operator.machines.map(assignment => plantEquipment.find(machine => machine.id === assignment)?.name || assignment)))) as string[];
      setAdminOperatorForm({ name: operator.name, machines });
      setAdminEditingOperatorId(operator.id);
    };
    const removeOperator = (operator) => {
      if (!window.confirm(`¿Quitar a ${operator.name} del listado de operarios?`)) return;
      setProductionLineOperators(current => current.filter(item => item.id !== operator.id));
    };
    const saveEquipment = () => {
      const name = adminEquipmentForm.name.trim();
      const line = adminEquipmentForm.line.trim();
      if (!name || !line) return;
      const standardSpeed = Number(adminEquipmentForm.standardSpeed) || 0;
      setPlantEquipment(current => adminEditingEquipmentId
        ? current.map(item => item.id === adminEditingEquipmentId ? { ...item, name, line, standardSpeed } : item)
        : [...current, { id: `EQ-${Date.now().toString().slice(-6)}`, name, line, standardSpeed, status: 'available' }]);
      setAdminEquipmentForm({ name: '', line: '', standardSpeed: '' });
      setAdminEditingEquipmentId('');
    };
    const editEquipment = (equipment) => {
      setAdminEquipmentForm({ name: equipment.name, line: equipment.line, standardSpeed: String(equipment.standardSpeed || '') });
      setAdminEditingEquipmentId(equipment.id);
    };
    const removeEquipment = (equipment) => {
      if (!window.confirm(`¿Quitar el equipo "${equipment.name}" de la planta?`)) return;
      setPlantEquipment(current => current.filter(item => item.id !== equipment.id));
    };
    return <div className="space-y-6 animate-in fade-in duration-300">
      <div><h2 className="text-2xl font-bold text-slate-800">Administración</h2><p className="text-slate-500">Selecciona primero la base de datos que deseas mantener.</p></div>
      <Card className="p-6"><label className="mb-2 block text-sm font-semibold text-slate-700">Área de edición</label><select value={adminSection} onChange={(event) => { setAdminSection(event.target.value); setAdminPlantSection(''); }} className="w-full rounded-lg border border-slate-300 bg-white p-3"><option value="">Seleccionar...</option><option value="stoppages">Detenciones</option><option value="plant">Planta</option></select></Card>
      {!adminSection && <Card className="p-10 text-center text-slate-500">Selecciona “Detenciones” o “Planta” para mostrar sus herramientas de edición.</Card>}
      {adminSection === 'stoppages' && <Card className="p-6"><h3 className="mb-4 text-lg font-bold text-slate-800">Base de motivos de detención</h3><label className="mb-1 block text-sm font-semibold text-slate-600">Tipo de registro</label><select value={adminLossCategory} onChange={(event) => setAdminLossCategory(event.target.value)} className="mb-4 w-full rounded-lg border border-slate-300 p-3">{Object.entries(categoryLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><div className="mb-4 flex gap-2"><input value={adminNewCause} onChange={(event) => setAdminNewCause(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addCause()} className="min-w-0 flex-1 rounded-lg border border-slate-300 p-3" placeholder="Nuevo motivo..."/><Button className="!px-4" disabled={!adminNewCause.trim()} onClick={addCause}><Plus size={17}/> Añadir</Button></div><div className="space-y-2">{lossCauses[adminLossCategory].map(cause => <div key={cause} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3"><span className="flex-1 text-sm font-medium">{cause}</span><button onClick={() => renameCause(adminLossCategory,cause)} className="rounded p-2 text-blue-600 hover:bg-blue-50" title="Editar"><Edit size={17}/></button><button onClick={() => removeCause(adminLossCategory,cause)} className="rounded p-2 text-rose-600 hover:bg-rose-50" title="Quitar"><Trash2 size={17}/></button></div>)}</div></Card>}
      {adminSection === 'plant' && <><Card className="p-6"><label className="mb-2 block text-sm font-semibold text-slate-700">Herramienta de planta</label><select value={adminPlantSection} onChange={(event) => setAdminPlantSection(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white p-3"><option value="">Seleccionar...</option><option value="personnel">Personal por máquina</option><option value="equipment">Máquinas y equipos</option></select></Card>
        {!adminPlantSection && <Card className="p-10 text-center text-slate-500">Selecciona “Personal por máquina” o “Máquinas y equipos”.</Card>}
        {adminPlantSection === 'personnel' && <Card className="p-6"><h3 className="mb-4 text-lg font-bold text-slate-800">Personal por máquina</h3><div className="mb-4 grid min-w-0 gap-3 md:grid-cols-2"><input value={adminOperatorForm.name} onChange={(event) => setAdminOperatorForm(current => ({...current,name:event.target.value}))} className="min-w-0 rounded-lg border border-slate-300 p-3" placeholder="Nombre del operario"/><div><select multiple value={adminOperatorForm.machines} onChange={(event) => setAdminOperatorForm(current => ({ ...current, machines: Array.from(event.target.selectedOptions, option => option.value) }))} className="h-36 w-full rounded-lg border border-slate-300 bg-white p-2"><option value="*">Todas las máquinas</option>{productionMachines.map(machine => <option key={machine} value={machine}>{machine}</option>)}</select><p className="mt-1 text-xs text-slate-500">Mantén Ctrl presionado para seleccionar varias máquinas.</p></div><div className="flex gap-2 md:col-span-2"><Button className="flex-1" disabled={!adminOperatorForm.name.trim() || !adminOperatorForm.machines.length} onClick={saveOperator}><Plus size={17}/> {adminEditingOperatorId ? 'Guardar cambios' : 'Añadir operario'}</Button>{adminEditingOperatorId && <Button variant="secondary" onClick={() => { setAdminEditingOperatorId(''); setAdminOperatorForm({ name: '', machines: [] }); }}>Cancelar</Button>}</div></div><div className="space-y-2">{productionLineOperators.map(operator => <div key={operator.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3"><div className="min-w-0 flex-1"><p className="font-medium text-slate-800">{operator.name}</p><p className="text-xs text-slate-500">{operator.machines.includes('*') ? 'Todas las máquinas' : operator.machines.join(', ')}</p></div><button onClick={() => editOperator(operator)} className="rounded p-2 text-blue-600 hover:bg-blue-50" title="Editar"><Edit size={17}/></button><button onClick={() => removeOperator(operator)} className="rounded p-2 text-rose-600 hover:bg-rose-50" title="Quitar"><Trash2 size={17}/></button></div>)}</div></Card>}
        {adminPlantSection === 'equipment' && <Card className="p-6"><h3 className="mb-4 text-lg font-bold text-slate-800">Equipos y líneas</h3><div className="mb-5 grid gap-3 md:grid-cols-3"><input value={adminEquipmentForm.name} onChange={(event) => setAdminEquipmentForm(current => ({ ...current, name: event.target.value }))} className="rounded-lg border border-slate-300 p-3" placeholder="Equipo (ej. Blistera B-01)"/><input value={adminEquipmentForm.line} onChange={(event) => setAdminEquipmentForm(current => ({ ...current, line: event.target.value }))} className="rounded-lg border border-slate-300 p-3" placeholder="Línea de producción"/><input type="number" min="0" value={adminEquipmentForm.standardSpeed} onChange={(event) => setAdminEquipmentForm(current => ({ ...current, standardSpeed: event.target.value }))} className="rounded-lg border border-slate-300 p-3" placeholder="Velocidad estándar"/><div className="flex gap-2 md:col-span-3"><Button className="flex-1" disabled={!adminEquipmentForm.name.trim() || !adminEquipmentForm.line.trim()} onClick={saveEquipment}><Plus size={17}/> {adminEditingEquipmentId ? 'Guardar cambios' : 'Añadir equipo'}</Button>{adminEditingEquipmentId && <Button variant="secondary" onClick={() => { setAdminEditingEquipmentId(''); setAdminEquipmentForm({ name: '', line: '', standardSpeed: '' }); }}>Cancelar</Button>}</div></div><div className="space-y-2">{plantEquipment.map(equipment => <div key={equipment.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3"><div className="min-w-0 flex-1"><p className="font-medium text-slate-800">{equipment.name}</p><p className="text-xs text-slate-500">{equipment.line} · {Number(equipment.standardSpeed || 0)} und/min</p></div><button onClick={() => editEquipment(equipment)} className="rounded p-2 text-blue-600 hover:bg-blue-50" title="Editar"><Edit size={17}/></button><button onClick={() => removeEquipment(equipment)} className="rounded p-2 text-rose-600 hover:bg-rose-50" title="Quitar"><Trash2 size={17}/></button></div>)}</div></Card>}
      </>}
    </div>;
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
          {role === 'supervisor' && <SidebarItem icon={Settings} label="Administración" viewId="administration" />}
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
            {currentView === 'work_orders' && WorkOrdersView()}
            {currentView === 'active_production' && <ActiveProductionView />}
            {currentView === 'validations' && <ValidationsView />}
            {currentView === 'administration' && AdministrationView()}
            {currentView === 'ai' && <AIAssistantView />}
          </div>
        </div>
      </main>
    </div>
  );
}


