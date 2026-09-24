import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { roleApi, type PermissionResponse, type RoleResponse, type SaveRoleRequest } from "@/lib/api";
import { Loader2, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<string, string> = {
  USER: "Kullanıcılar", DEPARTMENT: "Departmanlar", POSITION: "Pozisyonlar",
  CANDIDATE: "Adaylar", CANDIDATE_PROCESS: "Aday süreçleri", COMPENSATION: "Ücret bilgileri",
  CANDIDATE_NOTE: "Aday notları", CANDIDATE_EVALUATION: "Aday değerlendirmeleri",
  INTERVIEW: "Görüşmeler", PIPELINE: "İşe alım akışı", AUDIT: "Denetim kayıtları",
};

const emptyForm: SaveRoleRequest = { name: "", description: "", dataScope: "COMPANY", permissions: [] };

export function RoleManagementDialog({
  open, onOpenChange, onChanged,
}: { open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => Promise<void> | void }) {
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [permissions, setPermissions] = useState<PermissionResponse[]>([]);
  const [form, setForm] = useState<SaveRoleRequest>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const grouped = useMemo(() => permissions.reduce<Record<string, PermissionResponse[]>>((result, permission) => {
    (result[permission.category] ||= []).push(permission);
    return result;
  }, {}), [permissions]);

  const load = async () => {
    setLoading(true);
    try {
      const [roleList, permissionList] = await Promise.all([roleApi.getAll(), roleApi.getPermissions()]);
      setRoles(roleList);
      setPermissions(permissionList);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Rol bilgileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void load();
  }, [open]);

  const togglePermission = (code: string, checked: boolean) => {
    setForm(current => ({
      ...current,
      permissions: checked
        ? Array.from(new Set([...current.permissions, code]))
        : current.permissions.filter(item => item !== code),
    }));
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Rol adı zorunludur.");
    if (form.permissions.length === 0) return toast.error("En az bir yetki seçmelisiniz.");
    setSaving(true);
    try {
      if (editingId) await roleApi.update(editingId, { ...form, name: form.name.trim() });
      else await roleApi.create({ ...form, name: form.name.trim() });
      toast.success(editingId ? "Rol güncellendi." : "Rol oluşturuldu.");
      setEditingId(null);
      setForm(emptyForm);
      await load();
      await onChanged();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Rol kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const edit = (role: RoleResponse) => {
    setEditingId(role.id);
    setForm({
      name: role.name,
      description: role.description || "",
      dataScope: role.dataScope as SaveRoleRequest["dataScope"],
      permissions: role.permissions.map(permission => permission.code),
    });
  };

  const deactivate = async (role: RoleResponse) => {
    if (!window.confirm(`“${role.name}” rolünü pasifleştirmek istiyor musunuz?`)) return;
    try {
      await roleApi.deactivate(role.id);
      toast.success("Rol pasifleştirildi.");
      await load();
      await onChanged();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Rol pasifleştirilemedi.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Rol ve Yetki Yönetimi</DialogTitle></DialogHeader>
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin" /></div> : (
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <section className="space-y-3">
              <div><h3 className="font-semibold">Şirket rolleri</h3><p className="text-xs text-muted-foreground">Sistem rolü korunur; oluşturduğunuz roller düzenlenebilir.</p></div>
              {roles.length === 0 && <p className="rounded-lg border p-4 text-sm text-muted-foreground">Henüz özel rol oluşturulmamış.</p>}
              {roles.map(role => (
                <div key={role.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="font-medium">{role.name}</p><p className="text-xs text-muted-foreground">{role.permissions.length} yetki</p></div>
                    {role.systemRole ? <Badge variant="secondary">Sistem</Badge> : (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => edit(role)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => void deactivate(role)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </div>
                  {role.description && <p className="text-xs text-muted-foreground">{role.description}</p>}
                </div>
              ))}
            </section>

            <section className="space-y-4">
              <div><h3 className="font-semibold">{editingId ? "Rolü düzenle" : "Yeni rol oluştur"}</h3><p className="text-xs text-muted-foreground">Rol adını belirleyin ve kullanabileceği işlemleri seçin.</p></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="text-sm font-medium">Rol adı</label><Input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Örn: İşe Alım Uzmanı" /></div>
                <div><label className="text-sm font-medium">Veri kapsamı</label><Select value={form.dataScope} onValueChange={(value: SaveRoleRequest["dataScope"]) => setForm({ ...form, dataScope: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="COMPANY">Tüm şirket</SelectItem><SelectItem value="DEPARTMENT">Kendi departmanı</SelectItem><SelectItem value="ASSIGNED">Yalnızca atanan kayıtlar</SelectItem></SelectContent></Select></div>
              </div>
              <div><label className="text-sm font-medium">Açıklama</label><Textarea value={form.description || ""} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Bu rolün kullanım amacını yazın" /></div>
              <div className="space-y-4">
                {Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="rounded-lg border p-4">
                    <div className="mb-3 flex items-center justify-between"><h4 className="font-medium">{CATEGORY_LABELS[category] || category}</h4><Button type="button" variant="ghost" size="sm" onClick={() => setForm(current => ({ ...current, permissions: Array.from(new Set([...current.permissions, ...items.map(item => item.code)])) }))}>Tümünü seç</Button></div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {items.map(permission => (
                        <label key={permission.code} className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted">
                          <Checkbox checked={form.permissions.includes(permission.code)} onCheckedChange={checked => togglePermission(permission.code, checked === true)} />
                          <span><span className="block text-sm font-medium">{permission.name}</span>{permission.description && <span className="block text-xs text-muted-foreground">{permission.description}</span>}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                {editingId && <Button variant="outline" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Vazgeç</Button>}
                <Button onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}{editingId ? "Değişiklikleri kaydet" : "Rol oluştur"}</Button>
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
