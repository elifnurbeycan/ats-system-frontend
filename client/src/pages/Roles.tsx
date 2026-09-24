import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { roleApi, type PermissionResponse, type RoleResponse, type SaveRoleRequest } from "@/lib/api";
import { Loader2, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<string, string> = {
  USER: "Kullanıcılar", DEPARTMENT: "Departmanlar", POSITION: "Pozisyonlar",
  CANDIDATE: "Adaylar", CANDIDATE_PROCESS: "Aday süreçleri", COMPENSATION: "Ücret bilgileri",
  CANDIDATE_NOTE: "Aday notları", CANDIDATE_EVALUATION: "Aday değerlendirmeleri",
  CONTACT_LEAD: "İletişim kayıtları",
  INTERVIEW: "Görüşmeler", PIPELINE: "İşe alım akışı", AUDIT: "Denetim kayıtları",
};
const emptyForm: SaveRoleRequest = { name: "", description: "", dataScope: "COMPANY", permissions: [] };

export default function Roles() {
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [permissions, setPermissions] = useState<PermissionResponse[]>([]);
  const [form, setForm] = useState<SaveRoleRequest>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const grouped = useMemo(() => permissions.reduce<Record<string, PermissionResponse[]>>((result, permission) => {
    (result[permission.category] ||= []).push(permission);
    return result;
  }, {}), [permissions]);

  const load = async () => {
    setLoading(true);
    try {
      const [roleList, permissionList] = await Promise.all([roleApi.getAll(), roleApi.getPermissions()]);
      setRoles(roleList); setPermissions(permissionList);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Rol bilgileri yüklenemedi.");
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const edit = (role: RoleResponse) => {
    setEditingId(role.id);
    setForm({ name: role.name, description: role.description || "", dataScope: role.dataScope as SaveRoleRequest["dataScope"], permissions: role.permissions.map(item => item.code) });
    setShowForm(true);
  };
  const toggle = (code: string, checked: boolean) => setForm(current => ({ ...current, permissions: checked ? Array.from(new Set([...current.permissions, code])) : current.permissions.filter(item => item !== code) }));
  const save = async () => {
    if (!form.name.trim()) return toast.error("Rol adı zorunludur.");
    if (!form.permissions.length) return toast.error("En az bir yetki seçmelisiniz.");
    setSaving(true);
    try {
      if (editingId) await roleApi.update(editingId, { ...form, name: form.name.trim() });
      else await roleApi.create({ ...form, name: form.name.trim() });
      toast.success(editingId ? "Rol güncellendi." : "Rol oluşturuldu.");
      setShowForm(false); setForm(emptyForm); setEditingId(null); await load();
    } catch (error: any) { toast.error(error.response?.data?.message || "Rol kaydedilemedi."); }
    finally { setSaving(false); }
  };
  const deactivate = async (role: RoleResponse) => {
    if (!window.confirm(`“${role.name}” rolünü pasifleştirmek istiyor musunuz?`)) return;
    try { await roleApi.deactivate(role.id); toast.success("Rol pasifleştirildi."); await load(); }
    catch (error: any) { toast.error(error.response?.data?.message || "Rol pasifleştirilemedi."); }
  };

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="page-title flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" />Roller</h1><p className="mt-1 text-muted-foreground">Şirket kullanıcılarının hangi işlemleri yapabileceğini yönetin.</p></div>
      <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Yeni rol oluştur</Button>
    </div>
    {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div> : <>
      <Card><CardHeader><CardTitle>Mevcut roller</CardTitle><p className="text-sm text-muted-foreground">Sistem rolü korunur; oluşturduğunuz özel roller düzenlenebilir veya pasifleştirilebilir.</p></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {roles.map(role => <div key={role.id} className="rounded-xl border bg-card p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{role.name}</h3><p className="mt-1 text-xs text-muted-foreground">{role.permissions.length} yetki · {role.dataScope === "COMPANY" ? "Tüm şirket" : role.dataScope === "DEPARTMENT" ? "Departman" : "Atanan kayıtlar"}</p></div><Badge variant={role.systemRole ? "secondary" : "outline"}>{role.systemRole ? "Sistem" : "Özel"}</Badge></div>{role.description && <p className="mt-3 text-sm text-muted-foreground">{role.description}</p>}{!role.systemRole && <div className="mt-4 flex gap-2"><Button size="sm" variant="outline" onClick={() => edit(role)}><Pencil className="mr-1 h-3.5 w-3.5" />Düzenle</Button><Button size="sm" variant="ghost" className="text-destructive" onClick={() => void deactivate(role)}><Trash2 className="mr-1 h-3.5 w-3.5" />Pasifleştir</Button></div>}</div>)}
        {!roles.length && <p className="col-span-full rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Henüz özel rol oluşturulmamış. Yeni rol oluştur butonuyla başlayabilirsiniz.</p>}
      </CardContent></Card>
      {showForm && <Card><CardHeader><CardTitle>{editingId ? "Rolü düzenle" : "Yeni rol oluştur"}</CardTitle><p className="text-sm text-muted-foreground">Önce rolün adını ve kapsamını belirleyin, ardından bu rolün kullanabileceği yetkileri seçin.</p></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><div><label className="text-sm font-medium">Rol adı <span className="text-destructive">*</span></label><Input className="mt-1.5" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Örn. İşe alım uzmanı" /></div><div><label className="text-sm font-medium">Veri kapsamı</label><Select value={form.dataScope} onValueChange={(value: SaveRoleRequest["dataScope"]) => setForm({ ...form, dataScope: value })}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="COMPANY">Tüm şirket</SelectItem><SelectItem value="DEPARTMENT">Kendi departmanı</SelectItem><SelectItem value="ASSIGNED">Yalnızca atanan kayıtlar</SelectItem></SelectContent></Select></div></div><div><label className="text-sm font-medium">Açıklama</label><Textarea className="mt-1.5" value={form.description || ""} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Bu rol hangi amaçla kullanılacak?" /></div><div><div className="mb-3"><h3 className="font-semibold">Yetkiler</h3><p className="text-sm text-muted-foreground">Kullanıcının erişebileceği işlemleri kategori kategori seçin.</p></div><div className="grid gap-4 lg:grid-cols-2">{Object.entries(grouped).map(([category, items]) => <div key={category} className="rounded-xl border p-4"><div className="mb-3 flex items-center justify-between"><h4 className="font-medium">{CATEGORY_LABELS[category] || category}</h4><Button type="button" variant="ghost" size="sm" onClick={() => setForm(current => ({ ...current, permissions: Array.from(new Set([...current.permissions, ...items.map(item => item.code)])) }))}>Tümünü seç</Button></div><div className="space-y-2">{items.map(permission => <label key={permission.code} className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-muted"><Checkbox checked={form.permissions.includes(permission.code)} onCheckedChange={checked => toggle(permission.code, checked === true)} /><span><span className="block text-sm font-medium">{permission.name}</span>{permission.description && <span className="block text-xs text-muted-foreground">{permission.description}</span>}</span></label>)}</div></div>)}</div></div><div className="flex justify-end gap-2 border-t pt-4"><Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}>İptal</Button><Button onClick={() => void save()} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? "Değişiklikleri kaydet" : "Rolü oluştur"}</Button></div></CardContent></Card>}
    </>}
  </div>;
}
