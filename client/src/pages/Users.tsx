/*
 * Users Page - Kullanıcı Yönetimi
 * Company Admin rolü ile erişilebilir
 * Tablo formatında kullanıcı listesi, rol atama, departman atama
 */
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users as UsersIcon,
  Plus,
  Search,
  Shield,
  UserCheck,
  UserX,
  Edit,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { userApi, roleApi, departmentApi } from "@/lib/api";
import type { UserResponse, RoleResponse, Department, CreateUserRequest } from "@/lib/api";

export default function Users() {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    temporaryPassword: "",
    departmentId: null as number | null,
    roleIds: [] as number[],
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, rolesData, deptsData] = await Promise.all([
        userApi.getAll(),
        roleApi.getAll(),
        departmentApi.getAll(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setDepartments(deptsData);
    } catch (err: any) {
      toast.error("Veriler yüklenemedi: " + (err.message || "Bilinmeyen hata"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-generate temporary password on dialog open
  useEffect(() => {
    if (showCreateDialog) {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
      let pass = "";
      for (let i = 0; i < 12; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setCreateForm({
        firstName: "",
        lastName: "",
        email: "",
        temporaryPassword: pass,
        departmentId: null,
        roleIds: [],
      });
    }
  }, [showCreateDialog]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.fullName.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === "all" || user.roles.some((r) => r.code === filterRole);
    const matchesDept = filterDept === "all" || String(user.departmentId) === filterDept;
    return matchesSearch && matchesRole && matchesDept;
  });

  const handleCreateUser = async () => {
    if (!createForm.firstName || !createForm.lastName || !createForm.email || !createForm.temporaryPassword || createForm.roleIds.length === 0) {
      toast.error("Tüm zorunlu alanları doldurun");
      return;
    }
    if (createForm.temporaryPassword.length < 12) {
      toast.error("Geçici şifre en az 12 karakter olmalıdır");
      return;
    }
    setSubmitting(true);
    try {
      const data: CreateUserRequest = {
        firstName: createForm.firstName,
        lastName: createForm.lastName,
        email: createForm.email,
        temporaryPassword: createForm.temporaryPassword,
        departmentId: createForm.departmentId,
        roleIds: createForm.roleIds,
      };
      await userApi.create(data);
      toast.success("Kullanıcı başarıyla oluşturuldu");
      setShowCreateDialog(false);
      setCreateForm({ firstName: "", lastName: "", email: "", temporaryPassword: "", departmentId: null, roleIds: [] });
      await loadData();
    } catch (err: any) {
      toast.error("Kullanıcı oluşturulamadı: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (userId: number) => {
    try {
      await userApi.deactivate(userId);
      toast.success("Kullanıcı silindi");
      await loadData();
    } catch (err: any) {
      toast.error("İşlem başarısız: " + (err.message || "Bilinmeyen hata"));
    }
  };

  const handleActivate = async (userId: number) => {
    try {
      await userApi.activate(userId);
      toast.success("Kullanıcı aktifleştirildi");
      await loadData();
    } catch (err: any) {
      toast.error("İşlem başarısız: " + (err.message || "Bilinmeyen hata"));
    }
  };

  const handleResetPassword = async (user: UserResponse) => {
    const temporaryPassword = window.prompt(
      `${user.fullName} için Keycloak geçici parolasını girin (en az 12 karakter):`,
    );
    if (temporaryPassword === null) return;
    if (temporaryPassword.length < 12) {
      toast.error("Geçici şifre en az 12 karakter olmalıdır");
      return;
    }
    try {
      await userApi.resetPassword(user.id, temporaryPassword);
      toast.success("Parola Keycloak'ta yenilendi. İlk girişte değiştirilmesi istenecek.");
    } catch (err: any) {
      toast.error("Parola yenilenemedi: " + (err.response?.data?.message || err.message));
    }
  };

  const handleRoleChange = async (userId: number, newRoleIds: number[]) => {
    try {
      await userApi.updateRoles(userId, { roleIds: newRoleIds });
      toast.success("Roller güncellendi");
      await loadData();
    } catch (err: any) {
      toast.error("Rol güncellenemedi: " + (err.message || "Bilinmeyen hata"));
    }
  };

  const getRoleBadgeVariant = (roleCode: string) => {
    switch (roleCode) {
      case "COMPANY_ADMIN": return "destructive";
      case "RECRUITER":
      case "HR": return "default";
      case "HIRING_MANAGER": return "secondary";
      default: return "outline";
    }
  };

  const getRoleBadgeLabel = (role: RoleResponse) => {
    switch (role.code) {
      case "COMPANY_ADMIN": return "Şirket Yöneticisi";
      case "RECRUITER": return "İK / İşe Alım";
      case "HIRING_MANAGER": return "İşe Alım Yöneticisi";
      case "HR": return "İnsan Kaynakları";
      case "GENERAL_MANAGER": return "Genel Müdür";
      case "DEPARTMENT_MANAGER": return "Departman Yöneticisi";
      case "INTERVIEWER": return "Görüşmeci";
      default: return role.name || role.code;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Kullanıcı Yönetimi</h1>
          <p className="text-muted-foreground mt-1">
            Şirket kullanıcılarını yönetin, rol atayın
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateDialog(true)} className="bg-[#1e3a5f] hover:bg-[#2a4a6f]">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Kullanıcı
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="İsim veya e-posta ile ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Rol filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Roller</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.code}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Departman filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Departmanlar</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={String(dept.id)}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5" />
            Kullanıcılar ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad Soyad</TableHead>
                  <TableHead>E-posta</TableHead>
                  <TableHead>Departman</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center text-[#1e3a5f] font-medium text-sm">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <div>
                          <div className="font-medium">{user.fullName}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      {user.departmentName || (
                        <span className="text-muted-foreground text-sm">Atanmamış</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <Badge key={role.id} variant={getRoleBadgeVariant(role.code) as any}>
                            {getRoleBadgeLabel(role)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.active ? (
                        <Badge variant="default" className="bg-emerald-500">
                          <UserCheck className="w-3 h-3 mr-1" />
                          Aktif
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <UserX className="w-3 h-3 mr-1" />
                          Pasif
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Select
                          defaultValue={user.roles.map((r) => String(r.id)).join(",")}
                          onValueChange={(val: string) => {
                            const ids = val.split(",").map(Number);
                            handleRoleChange(user.id, ids);
                          }}
                        >
                          <SelectTrigger className="w-[140px]">
                            <Shield className="w-3 h-3 mr-1" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.id} value={String(role.id)}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {user.active ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeactivate(user.id)}
                          >
                            <UserX className="w-3 h-3 mr-1" />
                            Sil
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleActivate(user.id)}
                          >
                            <UserCheck className="w-3 h-3 mr-1" />
                            Aktifleştir
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResetPassword(user)}
                        >
                          Şifreyi sıfırla
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Kullanıcı Oluştur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Ad</label>
                <Input
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                  placeholder="Örn: Elif"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Soyad</label>
                <Input
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                  placeholder="Örn: Beycan"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">E-posta</label>
              <Input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="ornek@sirket.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Geçici Şifre * (En az 12 karakter)</label>
              <Input
                value={createForm.temporaryPassword}
                onChange={(e) => setCreateForm({ ...createForm, temporaryPassword: e.target.value })}
                placeholder="En az 12 karakter şifre girin"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Departman</label>
              <Select
                value={createForm.departmentId ? String(createForm.departmentId) : ""}
                onValueChange={(val: string) =>
                  setCreateForm({ ...createForm, departmentId: val && val !== "none" ? parseInt(val) : null })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Departman seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Atama yapma</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={String(dept.id)}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Rol(ler)</label>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <Badge
                    key={role.id}
                    variant={
                      createForm.roleIds.includes(role.id) ? "default" : "outline"
                    }
                    className={`cursor-pointer transition-all ${
                      createForm.roleIds.includes(role.id)
                        ? "bg-[#1e3a5f] hover:bg-[#2a4a6f]"
                        : "hover:bg-accent"
                    }`}
                    onClick={() => {
                      if (createForm.roleIds.includes(role.id)) {
                        setCreateForm({
                          ...createForm,
                          roleIds: createForm.roleIds.filter((id) => id !== role.id),
                        });
                      } else {
                        setCreateForm({
                          ...createForm,
                          roleIds: [...createForm.roleIds, role.id],
                        });
                      }
                    }}
                  >
                    {role.name}
                  </Badge>
                ))}
              </div>
              {roles.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Birden fazla rol seçebilirsiniz. Her rolün bir açıklaması ve veri kapsamı (COMPANY, DEPARTMENT, ASSIGNED) bulunur.
                </p>
              )}
            </div>
            <Separator />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                İptal
              </Button>
              <Button
                onClick={handleCreateUser}
                disabled={submitting}
                className="bg-[#1e3a5f] hover:bg-[#2a4a6f]"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Oluştur
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
