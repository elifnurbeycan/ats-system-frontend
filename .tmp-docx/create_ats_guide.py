from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

OUT = Path("docs/ATS-Yerel-Kurulum-ve-Veritabani-Yedekleme-Rehberi.docx")
OUT.parent.mkdir(parents=True, exist_ok=True)

NAVY = "173F5F"
BLUE = "0877D1"
LIGHT_BLUE = "EAF4FC"
LIGHT_GRAY = "F4F6F8"
MID_GRAY = "64748B"
TEXT = "17212B"
GREEN = "0B7A53"
RED = "B42318"

doc = Document()
sec = doc.sections[0]
sec.page_width = Inches(8.5)
sec.page_height = Inches(11)
sec.top_margin = Inches(0.8)
sec.bottom_margin = Inches(0.75)
sec.left_margin = Inches(0.85)
sec.right_margin = Inches(0.85)
sec.header_distance = Inches(0.35)
sec.footer_distance = Inches(0.35)

styles = doc.styles
normal = styles["Normal"]
normal.font.name = "Aptos"
normal._element.rPr.rFonts.set(qn("w:ascii"), "Aptos")
normal._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos")
normal.font.size = Pt(10.5)
normal.font.color.rgb = RGBColor.from_string(TEXT)
normal.paragraph_format.space_after = Pt(6)
normal.paragraph_format.line_spacing = 1.13

for name, size, color, before, after in [
    ("Heading 1", 18, NAVY, 14, 7),
    ("Heading 2", 14, BLUE, 11, 5),
    ("Heading 3", 11.5, NAVY, 8, 4),
]:
    s = styles[name]
    s.font.name = "Aptos Display"
    s._element.rPr.rFonts.set(qn("w:ascii"), "Aptos Display")
    s._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos Display")
    s.font.size = Pt(size)
    s.font.bold = True
    s.font.color.rgb = RGBColor.from_string(color)
    s.paragraph_format.space_before = Pt(before)
    s.paragraph_format.space_after = Pt(after)
    s.paragraph_format.keep_with_next = True

for list_style in ["List Bullet", "List Number"]:
    s = styles[list_style]
    s.font.name = "Aptos"
    s.font.size = Pt(10.5)
    s.paragraph_format.space_after = Pt(3)

def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)

def set_cell_margins(cell, top=120, start=140, bottom=120, end=140):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcMar = tcPr.first_child_found_in("w:tcMar")
    if tcMar is None:
        tcMar = OxmlElement("w:tcMar")
        tcPr.append(tcMar)
    for m, v in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tcMar.find(qn(f"w:{m}"))
        if node is None:
            node = OxmlElement(f"w:{m}")
            tcMar.append(node)
        node.set(qn("w:w"), str(v)); node.set(qn("w:type"), "dxa")

def set_table_widths(table, widths):
    table.autofit = False
    tblPr = table._tbl.tblPr
    tblW = tblPr.find(qn("w:tblW"))
    if tblW is None:
        tblW = OxmlElement("w:tblW"); tblPr.append(tblW)
    total = sum(widths)
    tblW.set(qn("w:w"), str(total)); tblW.set(qn("w:type"), "dxa")
    grid = table._tbl.tblGrid
    for child in list(grid): grid.remove(child)
    for w in widths:
        col = OxmlElement("w:gridCol"); col.set(qn("w:w"), str(w)); grid.append(col)
    for row in table.rows:
        for idx, cell in enumerate(row.cells):
            tcW = cell._tc.get_or_add_tcPr().find(qn("w:tcW"))
            if tcW is None:
                tcW = OxmlElement("w:tcW"); cell._tc.get_or_add_tcPr().append(tcW)
            tcW.set(qn("w:w"), str(widths[idx])); tcW.set(qn("w:type"), "dxa")
            set_cell_margins(cell)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER

def add_external_hyperlink(paragraph, text, url, color=BLUE):
    part = paragraph.part
    rid = part.relate_to(url, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink", is_external=True)
    hyperlink = OxmlElement("w:hyperlink"); hyperlink.set(qn("r:id"), rid)
    run = OxmlElement("w:r"); rPr = OxmlElement("w:rPr")
    c = OxmlElement("w:color"); c.set(qn("w:val"), color); rPr.append(c)
    u = OxmlElement("w:u"); u.set(qn("w:val"), "single"); rPr.append(u)
    t = OxmlElement("w:t"); t.text = text
    run.append(rPr); run.append(t); hyperlink.append(run); paragraph._p.append(hyperlink)

bookmark_id = 10
def add_bookmark(paragraph, name):
    global bookmark_id
    start = OxmlElement("w:bookmarkStart"); start.set(qn("w:id"), str(bookmark_id)); start.set(qn("w:name"), name)
    end = OxmlElement("w:bookmarkEnd"); end.set(qn("w:id"), str(bookmark_id))
    paragraph._p.insert(0, start); paragraph._p.append(end); bookmark_id += 1

def add_internal_link(paragraph, text, anchor, level=0):
    paragraph.paragraph_format.left_indent = Inches(0.2 * level)
    paragraph.paragraph_format.space_after = Pt(4)
    hyperlink = OxmlElement("w:hyperlink"); hyperlink.set(qn("w:anchor"), anchor); hyperlink.set(qn("w:history"), "1")
    run = OxmlElement("w:r"); rPr = OxmlElement("w:rPr")
    c = OxmlElement("w:color"); c.set(qn("w:val"), BLUE); rPr.append(c)
    u = OxmlElement("w:u"); u.set(qn("w:val"), "single"); rPr.append(u)
    t = OxmlElement("w:t"); t.text = text
    run.append(rPr); run.append(t); hyperlink.append(run); paragraph._p.append(hyperlink)

def add_page_field(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = paragraph.add_run("Sayfa ")
    run.font.size = Pt(9); run.font.color.rgb = RGBColor.from_string(MID_GRAY)
    fld = OxmlElement("w:fldSimple"); fld.set(qn("w:instr"), "PAGE")
    paragraph._p.append(fld)

def add_toc_field():
    """Insert Word's native, updateable Table of Contents field."""
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(6)
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    begin.set(qn("w:dirty"), "true")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = ' TOC \\o "1-3" \\h \\z \\u '
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    placeholder = OxmlElement("w:r")
    placeholder_text = OxmlElement("w:t")
    placeholder_text.text = "İçindekiler alanını güncellemek için Ctrl+A, ardından F9 tuşlarına basın."
    placeholder.append(placeholder_text)
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    p._p.extend([begin, instr, separate, placeholder, end])

    settings = doc.settings._element
    update = settings.find(qn("w:updateFields"))
    if update is None:
        update = OxmlElement("w:updateFields")
        settings.append(update)
    update.set(qn("w:val"), "true")

header = sec.header.paragraphs[0]
header.text = "ATS Sistem Dokümantasyonu  |  Yerel Kurulum ve Yedekleme"
header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
for r in header.runs:
    r.font.name = "Aptos"; r.font.size = Pt(8.5); r.font.color.rgb = RGBColor.from_string(MID_GRAY)
add_page_field(sec.footer.paragraphs[0])

def add_title(text, subtitle=None):
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(135); p.paragraph_format.space_after = Pt(10)
    r = p.add_run(text); r.bold = True; r.font.name = "Aptos Display"; r.font.size = Pt(31); r.font.color.rgb = RGBColor.from_string(NAVY)
    if subtitle:
        s = doc.add_paragraph(); s.alignment = WD_ALIGN_PARAGRAPH.CENTER; s.paragraph_format.space_after = Pt(30)
        rr = s.add_run(subtitle); rr.font.size = Pt(14); rr.font.color.rgb = RGBColor.from_string(BLUE)

def heading(text, level, anchor):
    p = doc.add_paragraph(text, style=f"Heading {level}")
    add_bookmark(p, anchor)
    return p

def bullet(text):
    doc.add_paragraph(text, style="List Bullet")

def numbered(text):
    doc.add_paragraph(text, style="List Number")

def code_block(text):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.15)
    p.paragraph_format.right_indent = Inches(0.15)
    p.paragraph_format.space_before = Pt(4); p.paragraph_format.space_after = Pt(8)
    pPr = p._p.get_or_add_pPr(); shd = OxmlElement("w:shd"); shd.set(qn("w:fill"), "F1F5F9"); pPr.append(shd)
    for idx, line in enumerate(text.splitlines()):
        if idx: p.add_run().add_break()
        r = p.add_run(line); r.font.name = "Cascadia Mono"; r._element.rPr.rFonts.set(qn("w:ascii"), "Cascadia Mono"); r.font.size = Pt(8.6); r.font.color.rgb = RGBColor.from_string("243447")
    return p

def note(label, text, color=BLUE, fill=LIGHT_BLUE):
    table = doc.add_table(rows=1, cols=1)
    set_table_widths(table, [9360])
    cell = table.cell(0,0); set_cell_shading(cell, fill)
    p = cell.paragraphs[0]; p.paragraph_format.space_after = Pt(0)
    a = p.add_run(label + ": "); a.bold = True; a.font.color.rgb = RGBColor.from_string(color)
    b = p.add_run(text); b.font.color.rgb = RGBColor.from_string(TEXT)
    doc.add_paragraph().paragraph_format.space_after = Pt(1)

# Cover
add_title("ATS Sistemi", "Yerel Kurulum, Çalıştırma ve Veritabanı Yedekleme Rehberi")
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("Applicant Tracking System • Geliştirici Kurulum Dokümanı"); r.font.size = Pt(11); r.font.color.rgb = RGBColor.from_string(MID_GRAY)
doc.add_paragraph().paragraph_format.space_after = Pt(42)

meta = doc.add_table(rows=3, cols=2)
set_table_widths(meta, [2500, 6860])
for i, (label, value) in enumerate([
    ("Doküman türü", "Teknik kurulum ve işletim rehberi"),
    ("Ortam", "Windows / PowerShell / Yerel geliştirme"),
    ("Güncelleme", "17 Ağustos 2026"),
]):
    meta.cell(i,0).text = label; meta.cell(i,1).text = value
    set_cell_shading(meta.cell(i,0), NAVY)
    for rr in meta.cell(i,0).paragraphs[0].runs: rr.font.color.rgb = RGBColor(255,255,255); rr.bold = True
    if i % 2 == 0: set_cell_shading(meta.cell(i,1), LIGHT_GRAY)

doc.add_paragraph().paragraph_format.space_after = Pt(38)
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
add_external_hyperlink(p, "Backend Repository", "https://github.com/elifnurbeycan/ats-system")
p.add_run("   •   ")
add_external_hyperlink(p, "Frontend Repository", "https://github.com/elifnurbeycan/ats-system-frontend")
doc.add_page_break()

# Native Word TOC (generated from Heading 1/2/3 styles)
toc = doc.add_paragraph()
toc.paragraph_format.space_after = Pt(12)
toc_run = toc.add_run("İçindekiler")
toc_run.bold = True
toc_run.font.name = "Aptos Display"
toc_run.font.size = Pt(24)
toc_run.font.color.rgb = RGBColor.from_string(NAVY)
add_toc_field()
note("Word İçindekiler", "Bu alan gerçek Word İçindekiler alanıdır ve Heading 1/2/3 stillerinden üretilir. Belgeyi açınca Ctrl+A ve ardından F9 tuşlarına basarak başlıkları ve sayfa numaralarını güncelleyin.")
doc.add_page_break()

heading("1. Proje ve teknoloji özeti", 1, "s1")
doc.add_paragraph("ATS, adayların ilk iletişim aşamasından işe alım sonucuna kadar izlenmesini sağlayan rol tabanlı bir aday takip sistemidir. Uygulama iki bağımsız repository halinde geliştirilir: Spring Boot REST API ve React kullanıcı arayüzü.")

table = doc.add_table(rows=1, cols=3)
set_table_widths(table, [1900, 3000, 4460])
for i, h in enumerate(["Katman", "Temel teknoloji", "Sorumluluk"]):
    table.cell(0,i).text=h; set_cell_shading(table.cell(0,i), NAVY)
    for rr in table.cell(0,i).paragraphs[0].runs: rr.font.color.rgb=RGBColor(255,255,255); rr.bold=True
for row in [
    ("Backend", "Java 21, Spring Boot 3.5.16", "REST API, iş kuralları, güvenlik, raporlama"),
    ("Veri", "PostgreSQL 17, JPA, Flyway", "Kalıcı veri, ilişkiler ve şema migration yönetimi"),
    ("Güvenlik", "Spring Security, JWT, Redis", "Kimlik doğrulama, yetki ve brute-force koruması"),
    ("Frontend", "React 19, TypeScript 5.6, Vite 7", "Kullanıcı arayüzü ve API entegrasyonu"),
    ("UI / Rapor", "Tailwind CSS 4, Recharts, XLSX", "Responsive arayüz, grafik ve Excel çıktıları"),
]:
    cells=table.add_row().cells
    for i,v in enumerate(row): cells[i].text=v

heading("2. Ön koşullar", 1, "s2")
doc.add_paragraph("Yerel geliştirme ortamında aşağıdaki yazılımlar bulunmalıdır:")
for x in ["Git", "JDK 21", "PostgreSQL 17", "Maven 3.9+ veya Maven Wrapper", "Node.js", "pnpm 10", "İsteğe bağlı: Docker Desktop, Redis ve Mailpit"]: bullet(x)
code_block("java -version\nmvn -version\nnode -v\npnpm -v\ngit --version\npsql --version")

heading("3. Kaynak kodun indirilmesi", 1, "s3")
heading("3.1 Backend", 2, "s3_1")
p=doc.add_paragraph("Repository: "); add_external_hyperlink(p, "github.com/elifnurbeycan/ats-system", "https://github.com/elifnurbeycan/ats-system")
code_block("cd C:\\Users\\<kullanici>\\Desktop\ngit clone https://github.com/elifnurbeycan/ats-system.git\ncd ats-system")
heading("3.2 Frontend", 2, "s3_2")
p=doc.add_paragraph("Repository: "); add_external_hyperlink(p, "github.com/elifnurbeycan/ats-system-frontend", "https://github.com/elifnurbeycan/ats-system-frontend")
code_block("cd C:\\Users\\<kullanici>\\Desktop\ngit clone https://github.com/elifnurbeycan/ats-system-frontend.git\ncd ats-system-frontend")

heading("4. PostgreSQL kurulumu", 1, "s4")
doc.add_paragraph("Projeyi başka bir bilgisayarda çalıştıracak geliştirici kendi PostgreSQL sunucusunda boş ve UTF-8 kodlamalı bir veritabanı oluşturur:")
code_block("CREATE DATABASE ats_system\n    WITH\n    OWNER = postgres\n    TEMPLATE = template0\n    ENCODING = 'UTF8';")
doc.add_paragraph("Komut satırı alternatifi:")
code_block("createdb -U postgres -h localhost -p 5432 -E UTF8 ats_system")
note("Bağlantı", "Varsayılan sunucu localhost, port 5432, veritabanı ats_system ve kullanıcı postgres'tir. Parolayı bu dokümana veya Git repository'sine yazmayın.")
doc.add_paragraph("Ardından backend repository'siyle birlikte paylaşılan anonimleştirilmiş başlangıç yedeği bu veritabanına geri yüklenir:")
code_block("cd C:\\Users\\<kullanici>\\Desktop\\ats-system\npg_restore `\n  -h localhost -p 5432 -U postgres `\n  -d ats_system --no-owner --no-privileges `\n  -v database\\ats_system_seed.dump")
note("Port ayrımı", "5432 frontend portu değildir; PostgreSQL veritabanı portudur. Frontend 3000, backend 8080, PostgreSQL ise 5432 portunda çalışır.", GREEN, "E9F7F1")

heading("5. Backend yapılandırması", 1, "s5")
doc.add_paragraph("Örnek geliştirme ayarını yerel dosyaya kopyalayın:")
code_block("cd C:\\Users\\<kullanici>\\Desktop\\ats-system\nCopy-Item src\\main\\resources\\application-dev.example.yaml `\n  src\\main\\resources\\application-dev.yaml")
doc.add_paragraph("Ardından application-dev.yaml içindeki yer tutucuları düzenleyin:")
code_block("spring:\n  datasource:\n    url: jdbc:postgresql://localhost:5432/ats_system\n    username: postgres\n    password: POSTGRESQL_PAROLASI\n\nsecurity:\n  jwt:\n    secret: EN_AZ_32_KARAKTER_UZUNLUGUNDA_GUVENLI_BIR_ANAHTAR")
note("Önemli", "application-dev.yaml yerel kimlik bilgileri içerir ve Git'e commit edilmemelidir.", RED, "FDECEC")

heading("6. Backend çalıştırma", 1, "s6")
code_block("cd C:\\Users\\<kullanici>\\Desktop\\ats-system\nmvn spring-boot:run \"-Dspring-boot.run.profiles=dev\"")
doc.add_paragraph("Maven Wrapper alternatifi:")
code_block(".\\mvnw.cmd spring-boot:run \"-Dspring-boot.run.profiles=dev\"")
doc.add_paragraph("IntelliJ Run Configuration ortam değişkeni:")
code_block("SPRING_PROFILES_ACTIVE=dev")
for x in ["API: http://localhost:8080", "Sağlık kontrolü: http://localhost:8080/actuator/health", "Flyway migration dosyaları açılışta otomatik çalışır."]: bullet(x)
heading("6.1 Backend testleri", 2, "s6_1")
code_block("mvn clean test")

heading("7. Frontend yapılandırması", 1, "s7")
doc.add_paragraph("Frontend kök dizininde .env dosyasını oluşturun veya güncelleyin:")
code_block("VITE_API_URL=http://localhost:8080\nVITE_COMPANY_ID=1")
doc.add_paragraph("Bağımlılıkları kurun ve uygulamayı başlatın:")
code_block("cd C:\\Users\\<kullanici>\\Desktop\\ats-system-frontend\npnpm install\npnpm dev")
for x in ["Frontend adresi: http://localhost:3000", "Bu port vite.config.ts içindeki server.port = 3000 ayarından gelir.", "Port doluysa strictPort=false nedeniyle Vite başka bir port seçebilir.", "TypeScript kontrolü: pnpm check", "Üretim derlemesi: pnpm build"]: bullet(x)
note("Paket yöneticisi", "Projede pnpm kullanılır. pnpm paketleri içerik adresli ortak depoda tutarak disk kullanımını azaltır ve kilit dosyasıyla tutarlı kurulum sağlar.")

heading("8. Redis ve Mailpit", 1, "s8")
heading("8.1 Redis", 2, "s8_1")
doc.add_paragraph("Redis, dağıtık giriş denemesi sayaçları ve brute-force koruması için önerilir:")
code_block("docker run --name ats-redis -d -p 6379:6379 redis:7-alpine\n# Daha sonra yeniden başlatmak için\ndocker start ats-redis")
heading("8.2 Mailpit ile yerel e-posta testi", 2, "s8_2")
code_block("docker run --name ats-mailpit -d `\n  -p 1025:1025 `\n  -p 8025:8025 `\n  axllent/mailpit")
for x in ["Mailpit arayüzü: http://localhost:8025", "SMTP sunucusu: localhost:1025"]: bullet(x)
code_block("MAIL_HOST=localhost\nMAIL_PORT=1025\nMAIL_SMTP_AUTH=false\nMAIL_STARTTLS_ENABLED=false\nMANAGER_REVIEW_MAIL_ENABLED=true\nMAIL_FROM=no-reply@ats.local\nFRONTEND_BASE_URL=http://localhost:3000")

heading("9. CV dosya depolaması", 1, "s9")
doc.add_paragraph("Yerel ortamda CV dosyaları varsayılan olarak backend altındaki ./data/uploads/cv dizininde tutulur. Konum aşağıdaki ortam değişkeniyle değiştirilebilir:")
code_block("ATS_CV_STORAGE_PATH=C:/ats-data/cv")
note("Yedekleme", "CV içerikleri PostgreSQL yedeğine dahil değildir. Tam yedek için veritabanı dump dosyasının yanında CV klasörünü de kopyalayın.", GREEN, "E9F7F1")

heading("10. Veritabanı dışa aktarma", 1, "s10")
doc.add_paragraph("Başka bir geliştiricinin projeyi kendi bilgisayarında aynı örnek verilerle çalıştırabilmesi için veritabanı yedeği backend repository'sinde database klasörü altında tutulabilir. Yalnızca anonimleştirilmiş geliştirme verisi paylaşılmalıdır.")
heading("10.1 Repository için önerilen başlangıç yedeği", 2, "s10_1")
code_block("cd C:\\Users\\<kullanici>\\Desktop\\ats-system\nNew-Item -ItemType Directory -Force database\npg_dump `\n  -h localhost -p 5432 -U postgres `\n  -F c -b --no-owner --no-privileges `\n  -f database\\ats_system_seed.dump `\n  ats_system")
doc.add_paragraph("Oluşan database/ats_system_seed.dump dosyası backend repository'sine eklenebilir:")
code_block("git add database\\ats_system_seed.dump\ngit commit -m \"chore: add anonymized development database seed\"\ngit push")
note("GitHub sınırı", "GitHub tek dosyada 100 MB sınırı uygular. Yedek büyükse Git LFS, GitHub Release veya erişim kontrollü harici depolama kullanın. Gerçek aday verilerini herkese açık repository'ye koymayın.", RED, "FDECEC")
heading("10.2 Okunabilir SQL alternatifi", 2, "s10_2")
code_block("pg_dump `\n  -h localhost -p 5432 -U postgres `\n  --encoding=UTF8 --no-owner --no-privileges `\n  -f database\\ats_system_seed.sql `\n  ats_system")
heading("10.3 pg_dump bulunamıyorsa", 2, "s10_3")
code_block("& \"C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe\" `\n  -h localhost -p 5432 -U postgres -F c -b -v `\n  -f C:\\ATS-Backups\\ats_system_backup.dump ats_system")

heading("11. Veritabanı geri yükleme", 1, "s11")
doc.add_paragraph("Repository'yi klonlayan geliştirici kendi bilgisayarında oluşturduğu boş ats_system veritabanına repository içindeki yedeği yükler.")
doc.add_paragraph("Custom-format .dump dosyası için:")
code_block("cd C:\\Users\\<kullanici>\\Desktop\\ats-system\npg_restore `\n  -h localhost -p 5432 -U postgres `\n  -d ats_system --no-owner --no-privileges `\n  -v database\\ats_system_seed.dump")
doc.add_paragraph("Düz .sql dosyası kullanıldıysa:")
code_block("psql -h localhost -p 5432 -U postgres `\n  -d ats_system `\n  -f database\\ats_system_seed.sql")
note("Migration uyumu", "Yedek tam şemayı içeriyorsa geri yükleme boş veritabanına yapılmalıdır. Uygulama açılışında Flyway geçmişi yedekteki flyway_schema_history tablosuyla uyumlu olmalıdır.", BLUE, LIGHT_BLUE)
heading("11.1 CV klasörünü yedekleme", 2, "s11_1")
code_block("Copy-Item `\n  -Path C:\\Users\\<kullanici>\\Desktop\\ats-system\\data\\uploads\\cv `\n  -Destination C:\\ATS-Backups\\cv `\n  -Recurse -Force")

heading("12. Doğrulama ve sorun giderme", 1, "s12")
table = doc.add_table(rows=1, cols=2)
set_table_widths(table, [3300, 6060])
for i,h in enumerate(["Belirti", "Kontrol / çözüm"]):
    table.cell(0,i).text=h; set_cell_shading(table.cell(0,i), NAVY)
    for rr in table.cell(0,i).paragraphs[0].runs: rr.font.color.rgb=RGBColor(255,255,255); rr.bold=True
for a,b in [
    ("Backend veritabanına bağlanamıyor", "PostgreSQL servisini, 5432 portunu ve application-dev.yaml bilgilerini kontrol edin."),
    ("Frontend API'ye erişemiyor", "Backend 8080 portunu, VITE_API_URL değerini ve CORS izinlerini kontrol edin."),
    ("Port kullanımda", "İlgili işlemi kapatın veya SERVER_PORT / Vite portunu değiştirin."),
    ("E-posta görünmüyor", "Mailpit container'ını, 1025 SMTP portunu ve MANAGER_REVIEW_MAIL_ENABLED değerini kontrol edin."),
    ("pg_dump bulunamadı", "PostgreSQL bin klasörünü PATH'e ekleyin veya tam exe yolunu kullanın."),
    ("Türkçe karakter sorunu", "Veritabanının UTF8 olduğunu ve yeni yedeğin --encoding=UTF8 ile alındığını doğrulayın."),
]:
    cells=table.add_row().cells; cells[0].text=a; cells[1].text=b

heading("13. Güvenlik ve teslim kontrolü", 1, "s13")
for x in [
    "Gerçek parola, JWT anahtarı ve SMTP kimlik bilgilerini dokümana veya Git'e eklemeyin.",
    "application-dev.yaml ve .env dosyalarının hassas değerlerini paylaşmadan önce temizleyin.",
    "Veritabanı yedeğini herkese açık repository'ye yüklemeyin.",
    "Aday e-posta, telefon, LinkedIn, maaş, not ve CV verilerini paylaşmadan önce anonimleştirin.",
    "CV klasörünü erişim kontrollü bir konumda saklayın.",
    "Teslimden önce backend testlerini ve frontend pnpm check komutunu çalıştırın.",
]: bullet(x)
heading("13.1 Kurulum doğrulama kontrol listesi", 2, "s13_1")
for x in ["PostgreSQL çalışıyor ve ats_system UTF8", "Backend dev profiliyle 8080'de çalışıyor", "Actuator health sonucu UP", "Frontend API URL'si doğru", "Giriş yapılabiliyor", "Redis ve Mailpit gerekiyorsa çalışıyor", "Yedek test veritabanına geri yüklenebiliyor", "CV klasörü ayrıca yedeklendi"]: bullet("☐ " + x)

heading("Ek A. Hızlı komut özeti", 1, "appendix")
heading("Backend", 2, "app_backend")
code_block("cd C:\\Users\\<kullanici>\\Desktop\\ats-system\nmvn spring-boot:run \"-Dspring-boot.run.profiles=dev\"")
heading("Frontend", 2, "app_frontend")
code_block("cd C:\\Users\\<kullanici>\\Desktop\\ats-system-frontend\npnpm install\npnpm dev")
heading("Yedek", 2, "app_backup")
code_block("cd C:\\Users\\<kullanici>\\Desktop\\ats-system\npg_dump -h localhost -p 5432 -U postgres -F c -b `\n  --no-owner --no-privileges `\n  -f database\\ats_system_seed.dump ats_system")
heading("Test", 2, "app_test")
code_block("# Backend\nmvn test\n# Frontend\npnpm check")

# Keep rows together where practical and repeat table headers.
for table in doc.tables:
    trPr = table.rows[0]._tr.get_or_add_trPr()
    hdr = OxmlElement("w:tblHeader"); hdr.set(qn("w:val"), "true"); trPr.append(hdr)
    for row in table.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                p.paragraph_format.space_after = Pt(2)

doc.core_properties.title = "ATS Sistemi Yerel Kurulum ve Veritabanı Yedekleme Rehberi"
doc.core_properties.subject = "ATS backend ve frontend yerel kurulum dokümantasyonu"
doc.core_properties.author = "ATS Proje Ekibi"
doc.core_properties.keywords = "ATS, Spring Boot, React, PostgreSQL, kurulum, yedekleme"
doc.save(OUT)
print(OUT.resolve())
