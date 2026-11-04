import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
import os

def create_document():
    doc = docx.Document()

    # Page Margins
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Styles
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(10.5)
    normal_style.font.color.rgb = RGBColor(0x1F, 0x29, 0x37) # Dark slate

    # Helper styling functions
    def set_cell_bg(cell, hex_color):
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
        cell._tc.get_or_add_tcPr().append(shd)

    def set_cell_padding(cell, top=120, bottom=120, left=160, right=160):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = OxmlElement('w:tcMar')
        for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
            node = OxmlElement(f'w:{m}')
            node.set(qn('w:w'), str(val))
            node.set(qn('w:type'), 'dxa')
            tcMar.append(node)
        tcPr.append(tcMar)

    def style_table_header(row, col_widths=None):
        for i, cell in enumerate(row.cells):
            set_cell_bg(cell, "1E3A8A") # Navy Blue
            set_cell_padding(cell, top=140, bottom=140, left=160, right=160)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            if col_widths and i < len(col_widths):
                cell.width = col_widths[i]
            for p in cell.paragraphs:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                for run in p.runs:
                    run.font.bold = True
                    run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
                    run.font.size = Pt(9.5)

    def style_table_rows(table, col_widths=None, alternate_shading=True):
        for r_idx, row in enumerate(table.rows[1:]):
            bg = "F8FAFC" if (r_idx % 2 == 1 and alternate_shading) else "FFFFFF"
            for c_idx, cell in enumerate(row.cells):
                set_cell_bg(cell, bg)
                set_cell_padding(cell, top=100, bottom=100, left=140, right=140)
                cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                if col_widths and c_idx < len(col_widths):
                    cell.width = col_widths[c_idx]
                for p in cell.paragraphs:
                    for run in p.runs:
                        run.font.size = Pt(9.0)

    def set_table_borders(table, border_color="CBD5E1"):
        tblPr = table._tbl.tblPr
        borders = parse_xml(f'''
            <w:tblBorders {nsdecls("w")}>
                <w:top w:val="single" w:sz="6" w:space="0" w:color="{border_color}"/>
                <w:left w:val="none"/>
                <w:bottom w:val="single" w:sz="8" w:space="0" w:color="{border_color}"/>
                <w:right w:val="none"/>
                <w:insideH w:val="single" w:sz="4" w:space="0" w:color="{border_color}"/>
                <w:insideV w:val="none"/>
            </w:tblBorders>
        ''')
        tblPr.append(borders)

    def add_callout(text, title="NOTE"):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = tbl.cell(0, 0)
        set_cell_bg(cell, "EFF6FF") # Light blue
        set_cell_padding(cell, top=120, bottom=120, left=200, right=200)
        
        # Border left in blue
        tcPr = cell._tc.get_or_add_tcPr()
        borders = parse_xml(f'''
            <w:tcBorders {nsdecls("w")}>
                <w:top w:val="none"/>
                <w:left w:val="single" w:sz="24" w:space="0" w:color="2563EB"/>
                <w:bottom w:val="none"/>
                <w:right w:val="none"/>
            </w:tcBorders>
        ''')
        tcPr.append(borders)
        
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        r_title = p.add_run(f"📌 {title}: ")
        r_title.bold = True
        r_title.font.color.rgb = RGBColor(0x1E, 0x40, 0xAF)
        r_text = p.add_run(text)
        r_text.font.size = Pt(9.5)
        p_space = doc.add_paragraph()
        p_space.paragraph_format.space_before = Pt(4)
        p_space.paragraph_format.space_after = Pt(4)

    # ==========================
    # COVER / HEADER SECTION
    # ==========================
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(12)
    title_p.paragraph_format.space_after = Pt(4)
    run_title = title_p.add_run("Ahmedabad Smart Parking System")
    run_title.font.name = 'Calibri'
    run_title.font.size = Pt(24)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A) # Deep Navy

    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_after = Pt(14)
    run_sub = sub_p.add_run("PostgreSQL Database Architecture & Column Specification Guide")
    run_sub.font.size = Pt(14)
    run_sub.font.color.rgb = RGBColor(0x4B, 0x55, 0x63) # Gray

    # Metadata pill
    meta_p = doc.add_paragraph()
    meta_p.paragraph_format.space_after = Pt(20)
    r_meta = meta_p.add_run("📁 Workspace: d:/COLLEGE/wad   |   💾 Database Engine: PostgreSQL 15+ / Neon / Supabase   |   📅 Date: October 2026")
    r_meta.font.size = Pt(8.5)
    r_meta.font.color.rgb = RGBColor(0x6B, 0x72, 0x80)

    doc.add_heading("1. Executive Summary & Column Count Overview", level=1)
    
    p_intro = doc.add_paragraph(
        "Currently, this web application stores its state in local flat JSON files (ahmedabad_parking.json, bookings.json, and users.json). "
        "In a professional production database such as PostgreSQL, data must be structured into normalized relational tables linked by Primary Keys and Foreign Keys. "
        "This prevents redundant duplication, guarantees ACID transactional safety during concurrent bay bookings, and allows instant querying via SQL."
    )
    p_intro.paragraph_format.space_after = Pt(10)

    add_callout("Total Database Scope: The system consists of 5 normalized tables containing a combined total of 63 columns in a standard relational schema (or 45 columns if IoT telemetry sensors are stored in a PostgreSQL JSONB column).", "KEY TAKEAWAY")

    # Summary Table
    sum_tbl = doc.add_table(rows=6, cols=5)
    sum_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(sum_tbl)
    
    headers = ["Table Name", "Primary Purpose", "Primary Key", "Foreign Keys", "Column Count"]
    for i, h in enumerate(headers):
        sum_tbl.cell(0, i).paragraphs[0].text = h

    summary_data = [
        ("users", "Registered drivers & vehicle profiles", "id (VARCHAR)", "None", "7 Columns"),
        ("locations", "Ahmedabad parking hubs & coordinates", "id (VARCHAR)", "None", "11 Columns"),
        ("parking_slots", "Parking bays, occupancy & IoT sensor telemetry", "id (VARCHAR)", "location_id", "21 Columns"),
        ("bookings", "Active & completed slot reservations", "booking_id (VARCHAR)", "user_id, location_id, slot_id", "14 Columns"),
        ("receipts", "Payment audit logs, tax invoices & receipts", "receipt_id (VARCHAR)", "booking_id", "10 Columns"),
    ]

    widths = [Inches(1.2), Inches(2.4), Inches(1.1), Inches(1.3), Inches(0.9)]
    style_table_header(sum_tbl.rows[0], widths)

    for row_idx, data in enumerate(summary_data, start=1):
        row = sum_tbl.rows[row_idx]
        for col_idx, val in enumerate(data):
            row.cells[col_idx].paragraphs[0].text = val
            if col_idx == 0:
                row.cells[col_idx].paragraphs[0].runs[0].font.bold = True
            if col_idx == 4:
                row.cells[col_idx].paragraphs[0].runs[0].font.bold = True
                row.cells[col_idx].paragraphs[0].runs[0].font.color.rgb = RGBColor(0x1E, 0x40, 0xAF)

    style_table_rows(sum_tbl, widths)

    p_after_sum = doc.add_paragraph()
    p_after_sum.paragraph_format.space_before = Pt(8)

    # ==========================
    # SECTION 2: DETAILED TABLE SPECIFICATIONS
    # ==========================
    doc.add_heading("2. Detailed Table Specifications (All 63 Columns)", level=1)
    
    # 2.1 USERS
    doc.add_heading("2.1 Table: users (7 Columns)", level=2)
    doc.add_paragraph("Stores registered drivers, vehicle metadata, and authentication timestamps.")
    
    users_tbl = doc.add_table(rows=8, cols=5)
    users_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(users_tbl)
    
    col_headers = ["Column Name", "PostgreSQL Data Type", "Constraints", "Default", "Description / Example"]
    for i, h in enumerate(col_headers):
        users_tbl.cell(0, i).paragraphs[0].text = h
    
    users_cols = [
        ("id", "VARCHAR(50)", "PRIMARY KEY", "None", "Unique user ID (e.g. usr_1790253785729)"),
        ("name", "VARCHAR(100)", "NOT NULL", "None", "Driver full name (e.g. 'Karan Patel')"),
        ("phone", "VARCHAR(20)", "UNIQUE, NOT NULL", "None", "Mobile number for SMS / login verification"),
        ("car_number", "VARCHAR(30)", "UNIQUE, NOT NULL", "None", "Standard vehicle plate (e.g. 'GJ-01-AB-1234')"),
        ("vehicle_type", "VARCHAR(20)", "CHECK in list", "'compact'", "Category: compact, suv, ev, bike"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "CURRENT_TIMESTAMP", "Account creation timestamp with timezone"),
        ("last_login", "TIMESTAMPTZ", "NULLABLE", "CURRENT_TIMESTAMP", "Timestamp of most recent system login"),
    ]
    
    u_widths = [Inches(1.2), Inches(1.3), Inches(1.2), Inches(1.1), Inches(2.1)]
    style_table_header(users_tbl.rows[0], u_widths)
    for r_idx, col_data in enumerate(users_cols, start=1):
        row = users_tbl.rows[r_idx]
        for c_idx, val in enumerate(col_data):
            row.cells[c_idx].paragraphs[0].text = val
            if c_idx == 0:
                row.cells[c_idx].paragraphs[0].runs[0].font.bold = True
    style_table_rows(users_tbl, u_widths)

    p_sp1 = doc.add_paragraph()
    p_sp1.paragraph_format.space_before = Pt(8)

    # 2.2 LOCATIONS
    doc.add_heading("2.2 Table: locations (11 Columns)", level=2)
    doc.add_paragraph("Stores physical parking structures across Ahmedabad city zones.")

    loc_tbl = doc.add_table(rows=12, cols=5)
    loc_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(loc_tbl)
    for i, h in enumerate(col_headers):
        loc_tbl.cell(0, i).paragraphs[0].text = h

    loc_cols = [
        ("id", "VARCHAR(50)", "PRIMARY KEY", "None", "Unique hub slug (e.g. 'loc-cg-road', 'loc-sbr')"),
        ("name", "VARCHAR(150)", "NOT NULL", "None", "Full parking deck name (e.g. 'CG Road Smart Parking')"),
        ("area", "VARCHAR(100)", "NOT NULL", "None", "Ahmedabad locality (Navrangpura, Vastrapur, Bodakdev)"),
        ("address", "TEXT", "NOT NULL", "None", "Complete physical street address & postal code"),
        ("lat", "NUMERIC(10, 6)", "NOT NULL", "None", "GPS Latitude coordinate (e.g. 23.031500)"),
        ("lng", "NUMERIC(10, 6)", "NOT NULL", "None", "GPS Longitude coordinate (e.g. 72.557400)"),
        ("rating", "NUMERIC(2, 1)", "NOT NULL", "4.5", "User satisfaction rating out of 5.0 (e.g. 4.8)"),
        ("hourly_rate", "NUMERIC(8, 2)", "NOT NULL", "30.00", "Base hourly parking fee in INR (₹25 - ₹60)"),
        ("currency", "VARCHAR(10)", "NOT NULL", "'₹'", "Currency code or symbol"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "CURRENT_TIMESTAMP", "Record registration timestamp"),
        ("updated_at", "TIMESTAMPTZ", "NOT NULL", "CURRENT_TIMESTAMP", "Last update timestamp for dynamic pricing"),
    ]
    style_table_header(loc_tbl.rows[0], u_widths)
    for r_idx, col_data in enumerate(loc_cols, start=1):
        row = loc_tbl.rows[r_idx]
        for c_idx, val in enumerate(col_data):
            row.cells[c_idx].paragraphs[0].text = val
            if c_idx == 0:
                row.cells[c_idx].paragraphs[0].runs[0].font.bold = True
    style_table_rows(loc_tbl, u_widths)

    p_sp2 = doc.add_paragraph()
    p_sp2.paragraph_format.space_before = Pt(8)

    # 2.3 PARKING SLOTS
    doc.add_heading("2.3 Table: parking_slots (21 Columns)", level=2)
    doc.add_paragraph("Stores individual parking bays, real-time occupancy state, and live IoT sensor telemetry readings.")

    slots_tbl = doc.add_table(rows=22, cols=5)
    slots_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(slots_tbl)
    for i, h in enumerate(col_headers):
        slots_tbl.cell(0, i).paragraphs[0].text = h

    slots_cols = [
        ("id", "VARCHAR(50)", "PRIMARY KEY", "None", "Unique bay ID (e.g. 'loc-cg-road_A-01')"),
        ("location_id", "VARCHAR(50)", "FK ➔ locations(id)", "None", "Reference to the parent parking facility"),
        ("slot_code", "VARCHAR(20)", "NOT NULL", "None", "Bay designation code (e.g. 'A-01', 'B-12')"),
        ("spot_number", "INTEGER", "NOT NULL", "None", "Numeric bay index (1 through 50)"),
        ("zone", "VARCHAR(5)", "NOT NULL", "None", "Facility zone (A, B, C, D)"),
        ("slot_type", "VARCHAR(20)", "NOT NULL", "'compact'", "Bay type: compact, suv, ev, bike, vip"),
        ("status", "VARCHAR(20)", "NOT NULL", "'available'", "Occupancy state: available, occupied, reserved"),
        ("current_plate", "VARCHAR(30)", "NULLABLE", "None", "Parked vehicle plate number (if occupied)"),
        ("current_driver", "VARCHAR(100)", "NULLABLE", "None", "Name of the driver parked in the bay"),
        ("current_phone", "VARCHAR(20)", "NULLABLE", "None", "Driver phone contact for alerts"),
        ("parked_at", "TIMESTAMPTZ", "NULLABLE", "None", "Timestamp when the vehicle entered the bay"),
        ("battery_level", "INTEGER", "NULLABLE", "None", "EV battery percentage (0-100%, NULL for fuel)"),
        ("sensor_ultrasonic", "NUMERIC(6, 2)", "NULLABLE", "100.00", "Ultrasonic overhead distance sensor (cm)"),
        ("sensor_proximity", "NUMERIC(6, 2)", "NULLABLE", "2.50", "Proximity radar reading (meters)"),
        ("sensor_pressure", "NUMERIC(6, 2)", "NULLABLE", "3.00", "Ground piezoelectric weight sensor (tons)"),
        ("sensor_noise", "NUMERIC(6, 2)", "NULLABLE", "50.00", "Environmental ambient acoustic level (dB)"),
        ("sensor_temperature", "NUMERIC(5, 2)", "NULLABLE", "28.00", "Bay ambient ground temperature (°C)"),
        ("nearby_traffic", "VARCHAR(20)", "NULLABLE", "'Low'", "Real-time street traffic: Low, Medium, High"),
        ("dynamic_pricing_factor", "NUMERIC(4, 2)", "NOT NULL", "1.00", "Live demand multiplier (1.00x - 1.75x)"),
        ("spot_size", "VARCHAR(30)", "NOT NULL", "'Standard'", "Physical dimensions: Standard, Oversized"),
        ("updated_at", "TIMESTAMPTZ", "NOT NULL", "CURRENT_TIMESTAMP", "Timestamp of most recent IoT sensor heartbeat"),
    ]
    style_table_header(slots_tbl.rows[0], u_widths)
    for r_idx, col_data in enumerate(slots_cols, start=1):
        row = slots_tbl.rows[r_idx]
        for c_idx, val in enumerate(col_data):
            row.cells[c_idx].paragraphs[0].text = val
            if c_idx == 0:
                row.cells[c_idx].paragraphs[0].runs[0].font.bold = True
    style_table_rows(slots_tbl, u_widths)

    p_sp3 = doc.add_paragraph()
    p_sp3.paragraph_format.space_before = Pt(8)

    # 2.4 BOOKINGS
    doc.add_heading("2.4 Table: bookings (14 Columns)", level=2)
    doc.add_paragraph("Stores driver reservations, active parking sessions, duration tracking, and lifecycle status.")

    book_tbl = doc.add_table(rows=15, cols=5)
    book_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(book_tbl)
    for i, h in enumerate(col_headers):
        book_tbl.cell(0, i).paragraphs[0].text = h

    book_cols = [
        ("booking_id", "VARCHAR(50)", "PRIMARY KEY", "None", "Formatted session ID (e.g. 'BK-429718-316')"),
        ("user_id", "VARCHAR(50)", "FK ➔ users(id)", "None", "Associated registered user (nullable for guests)"),
        ("location_id", "VARCHAR(50)", "FK ➔ locations(id)", "None", "Target parking facility"),
        ("slot_id", "VARCHAR(50)", "FK ➔ parking_slots(id)", "None", "Target parking slot bay ID"),
        ("plate", "VARCHAR(30)", "NOT NULL", "None", "Vehicle license plate (e.g. 'GJ-01-AB-1234')"),
        ("driver_name", "VARCHAR(100)", "NOT NULL", "None", "Name of the driver who booked"),
        ("phone", "VARCHAR(20)", "NOT NULL", "None", "Contact mobile number"),
        ("vehicle_type", "VARCHAR(20)", "NOT NULL", "'compact'", "Category: compact, suv, ev, bike"),
        ("hourly_rate", "NUMERIC(8, 2)", "NOT NULL", "None", "Rate agreed upon at booking creation (₹)"),
        ("booked_duration_hours", "INTEGER", "NOT NULL", "2", "Estimated parking hours selected by user"),
        ("status", "VARCHAR(20)", "NOT NULL", "'active'", "Lifecycle: active, completed, cancelled"),
        ("parked_at", "TIMESTAMPTZ", "NOT NULL", "CURRENT_TIMESTAMP", "Vehicle entry check-in time"),
        ("exit_time", "TIMESTAMPTZ", "NULLABLE", "None", "Vehicle exit check-out time (set on release)"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "CURRENT_TIMESTAMP", "Booking record timestamp"),
    ]
    style_table_header(book_tbl.rows[0], u_widths)
    for r_idx, col_data in enumerate(book_cols, start=1):
        row = book_tbl.rows[r_idx]
        for c_idx, val in enumerate(col_data):
            row.cells[c_idx].paragraphs[0].text = val
            if c_idx == 0:
                row.cells[c_idx].paragraphs[0].runs[0].font.bold = True
    style_table_rows(book_tbl, u_widths)

    p_sp4 = doc.add_paragraph()
    p_sp4.paragraph_format.space_before = Pt(8)

    # 2.5 RECEIPTS
    doc.add_heading("2.5 Table: receipts (10 Columns)", level=2)
    doc.add_paragraph("Stores final invoices, duration calculations, GST taxation, and checkout audit records.")

    rcp_tbl = doc.add_table(rows=11, cols=5)
    rcp_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(rcp_tbl)
    for i, h in enumerate(col_headers):
        rcp_tbl.cell(0, i).paragraphs[0].text = h

    rcp_cols = [
        ("receipt_id", "VARCHAR(50)", "PRIMARY KEY", "None", "Formatted invoice ID (e.g. 'RCP-AHM-218725')"),
        ("booking_id", "VARCHAR(50)", "FK ➔ bookings(booking_id)", "None", "Unique 1-to-1 link to completed booking"),
        ("subtotal", "NUMERIC(10, 2)", "NOT NULL", "None", "Base fee (billed_hours × hourly_rate)"),
        ("tax", "NUMERIC(10, 2)", "NOT NULL", "None", "5% GST tax calculation (subtotal × 0.05)"),
        ("total_amount", "NUMERIC(10, 2)", "NOT NULL", "None", "Final bill paid (subtotal + tax) in INR"),
        ("payment_method", "VARCHAR(30)", "NOT NULL", "'UPI'", "Payment mode: UPI, FASTAG, CARD, CASH"),
        ("payment_status", "VARCHAR(20)", "NOT NULL", "'PAID'", "Status: PAID, REFUNDED, PENDING"),
        ("duration_text", "VARCHAR(100)", "NOT NULL", "None", "Display text (e.g. '1h 15m (2 hr billed)')"),
        ("billed_hours", "INTEGER", "NOT NULL", "None", "Ceiling billable hours"),
        ("paid_at", "TIMESTAMPTZ", "NOT NULL", "CURRENT_TIMESTAMP", "Settlement timestamp"),
    ]
    style_table_header(rcp_tbl.rows[0], u_widths)
    for r_idx, col_data in enumerate(rcp_cols, start=1):
        row = rcp_tbl.rows[r_idx]
        for c_idx, val in enumerate(col_data):
            row.cells[c_idx].paragraphs[0].text = val
            if c_idx == 0:
                row.cells[c_idx].paragraphs[0].runs[0].font.bold = True
    style_table_rows(rcp_tbl, u_widths)

    # ==========================
    # SECTION 3: VISUAL POSTGRESQL REPRESENTATION
    # ==========================
    doc.add_page_break()
    doc.add_heading("3. Visual PostgreSQL Data Representation (How It Looks in psql / DBeaver)", level=1)
    doc.add_paragraph(
        "Below are tabular mock representations illustrating exactly how data appears inside PostgreSQL when queried with standard SQL SELECT commands."
    )

    # Sample Locations
    doc.add_heading("3.1 SELECT * FROM locations LIMIT 4;", level=2)
    s_loc_tbl = doc.add_table(rows=5, cols=6)
    s_loc_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(s_loc_tbl)
    
    sloc_headers = ["id", "name", "area", "lat", "lng", "hourly_rate"]
    for i, h in enumerate(sloc_headers):
        s_loc_tbl.cell(0, i).paragraphs[0].text = h
    
    sloc_data = [
        ("loc-cg-road", "CG Road Multi-Level Smart Parking", "Navrangpura", "23.0315", "72.5574", "₹30.00"),
        ("loc-vastrapur", "Vastrapur Lake Commercial Hub", "Vastrapur", "23.0350", "72.5293", "₹40.00"),
        ("loc-riverfront", "Sabarmati Riverfront Promenade", "Riverfront West", "23.0304", "72.5707", "₹25.00"),
        ("loc-sbr", "Sindhu Bhavan Smart Hub Parking", "Bodakdev", "23.0456", "72.5078", "₹60.00"),
    ]
    sloc_widths = [Inches(1.2), Inches(2.2), Inches(1.3), Inches(0.8), Inches(0.8), Inches(0.8)]
    style_table_header(s_loc_tbl.rows[0], sloc_widths)
    for r_idx, d in enumerate(sloc_data, start=1):
        row = s_loc_tbl.rows[r_idx]
        for c_idx, v in enumerate(d):
            row.cells[c_idx].paragraphs[0].text = v
    style_table_rows(s_loc_tbl, sloc_widths)

    p_sp5 = doc.add_paragraph()
    p_sp5.paragraph_format.space_before = Pt(8)

    # Sample Slots
    doc.add_heading("3.2 SELECT id, zone, slot_type, status, current_plate, sensor_ultrasonic FROM parking_slots LIMIT 5;", level=2)
    s_slot_tbl = doc.add_table(rows=6, cols=6)
    s_slot_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(s_slot_tbl)

    sslot_headers = ["id", "zone", "slot_type", "status", "current_plate", "sensor_ultrasonic"]
    for i, h in enumerate(sslot_headers):
        s_slot_tbl.cell(0, i).paragraphs[0].text = h

    sslot_data = [
        ("loc-cg-road_A-01", "A", "compact", "occupied", "GJ-01-AB-1234", "18.4 cm"),
        ("loc-cg-road_A-02", "A", "ev", "available", "NULL", "102.5 cm"),
        ("loc-cg-road_B-01", "B", "suv", "occupied", "GJ-01-EV-5542", "22.1 cm"),
        ("loc-cg-road_B-02", "B", "bike", "available", "NULL", "98.0 cm"),
        ("loc-cg-road_C-01", "C", "vip", "occupied", "GJ-01-DX-9901", "15.0 cm"),
    ]
    sslot_widths = [Inches(1.5), Inches(0.6), Inches(1.0), Inches(1.0), Inches(1.5), Inches(1.3)]
    style_table_header(s_slot_tbl.rows[0], sslot_widths)
    for r_idx, d in enumerate(sslot_data, start=1):
        row = s_slot_tbl.rows[r_idx]
        for c_idx, v in enumerate(d):
            row.cells[c_idx].paragraphs[0].text = v
    style_table_rows(s_slot_tbl, sslot_widths)

    p_sp6 = doc.add_paragraph()
    p_sp6.paragraph_format.space_before = Pt(8)

    # Sample Bookings
    doc.add_heading("3.3 SELECT booking_id, slot_id, plate, driver_name, status, hourly_rate FROM bookings LIMIT 3;", level=2)
    s_bk_tbl = doc.add_table(rows=4, cols=6)
    s_bk_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(s_bk_tbl)

    sbk_headers = ["booking_id", "slot_id", "plate", "driver_name", "status", "hourly_rate"]
    for i, h in enumerate(sbk_headers):
        s_bk_tbl.cell(0, i).paragraphs[0].text = h

    sbk_data = [
        ("BK-429718-316", "A-02", "GJ-01-AB-1234", "Karan Patel", "active", "₹30.00"),
        ("BK-994083-444", "A-02", "GJ-01-DX-9901", "Aarav Patel", "completed", "₹30.00"),
        ("BK-102938-781", "B-01", "GJ-01-EV-5542", "Pooja Mehta", "active", "₹40.00"),
    ]
    sbk_widths = [Inches(1.5), Inches(0.8), Inches(1.4), Inches(1.4), Inches(1.0), Inches(0.9)]
    style_table_header(s_bk_tbl.rows[0], sbk_widths)
    for r_idx, d in enumerate(sbk_data, start=1):
        row = s_bk_tbl.rows[r_idx]
        for c_idx, v in enumerate(d):
            row.cells[c_idx].paragraphs[0].text = v
    style_table_rows(s_bk_tbl, sbk_widths)

    p_sp7 = doc.add_paragraph()
    p_sp7.paragraph_format.space_before = Pt(8)

    # Sample Receipts
    doc.add_heading("3.4 SELECT receipt_id, booking_id, subtotal, tax, total_amount, payment_method FROM receipts LIMIT 2;", level=2)
    s_rcp_tbl = doc.add_table(rows=3, cols=6)
    s_rcp_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(s_rcp_tbl)

    srcp_headers = ["receipt_id", "booking_id", "subtotal", "tax (5%)", "total_amount", "payment_method"]
    for i, h in enumerate(srcp_headers):
        s_rcp_tbl.cell(0, i).paragraphs[0].text = h

    srcp_data = [
        ("RCP-AHM-218725", "BK-994083-444", "₹30.00", "₹1.50", "₹31.50", "UPI (Google Pay)"),
        ("RCP-AHM-654120", "BK-102938-781", "₹80.00", "₹4.00", "₹84.00", "FASTAG"),
    ]
    srcp_widths = [Inches(1.5), Inches(1.5), Inches(0.9), Inches(0.9), Inches(1.1), Inches(1.2)]
    style_table_header(s_rcp_tbl.rows[0], srcp_widths)
    for r_idx, d in enumerate(srcp_data, start=1):
        row = s_rcp_tbl.rows[r_idx]
        for c_idx, v in enumerate(d):
            row.cells[c_idx].paragraphs[0].text = v
    style_table_rows(s_rcp_tbl, srcp_widths)

    # ==========================
    # SECTION 4: COMPLETE SQL DDL SCRIPT
    # ==========================
    doc.add_page_break()
    doc.add_heading("4. Ready-to-Run PostgreSQL DDL Script", level=1)
    doc.add_paragraph("You can execute the following SQL script directly inside pgAdmin, DBeaver, or psql to initialize the entire schema:")

    sql_code = """-- ============================================================
-- AHMEDABAD SMART PARKING MANAGEMENT SYSTEM
-- PostgreSQL Database Initialization Script
-- ============================================================

-- Enable UUID extension if UUIDs are preferred
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. LOCATIONS TABLE (11 Columns)
CREATE TABLE IF NOT EXISTS locations (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    area VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    lat NUMERIC(10, 6) NOT NULL,
    lng NUMERIC(10, 6) NOT NULL,
    rating NUMERIC(2, 1) DEFAULT 4.5,
    hourly_rate NUMERIC(8, 2) NOT NULL DEFAULT 30.00,
    currency VARCHAR(10) DEFAULT '₹',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS TABLE (7 Columns)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    car_number VARCHAR(30) UNIQUE NOT NULL,
    vehicle_type VARCHAR(20) DEFAULT 'compact',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. PARKING SLOTS TABLE (21 Columns)
CREATE TABLE IF NOT EXISTS parking_slots (
    id VARCHAR(50) PRIMARY KEY,
    location_id VARCHAR(50) NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    slot_code VARCHAR(20) NOT NULL,
    spot_number INTEGER NOT NULL,
    zone VARCHAR(5) NOT NULL,
    slot_type VARCHAR(20) DEFAULT 'compact',
    status VARCHAR(20) DEFAULT 'available',
    current_plate VARCHAR(30),
    current_driver VARCHAR(100),
    current_phone VARCHAR(20),
    parked_at TIMESTAMPTZ,
    battery_level INTEGER,
    sensor_ultrasonic NUMERIC(6, 2),
    sensor_proximity NUMERIC(6, 2),
    sensor_pressure NUMERIC(6, 2),
    sensor_noise NUMERIC(6, 2),
    sensor_temperature NUMERIC(5, 2),
    nearby_traffic VARCHAR(20) DEFAULT 'Low',
    dynamic_pricing_factor NUMERIC(4, 2) DEFAULT 1.0,
    spot_size VARCHAR(30) DEFAULT 'Standard',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. BOOKINGS TABLE (14 Columns)
CREATE TABLE IF NOT EXISTS bookings (
    booking_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    location_id VARCHAR(50) NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    slot_id VARCHAR(50) NOT NULL REFERENCES parking_slots(id) ON DELETE RESTRICT,
    plate VARCHAR(30) NOT NULL,
    driver_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(20) DEFAULT 'compact',
    hourly_rate NUMERIC(8, 2) NOT NULL,
    booked_duration_hours INTEGER DEFAULT 2,
    status VARCHAR(20) DEFAULT 'active',
    parked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    exit_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. RECEIPTS TABLE (10 Columns)
CREATE TABLE IF NOT EXISTS receipts (
    receipt_id VARCHAR(50) PRIMARY KEY,
    booking_id VARCHAR(50) UNIQUE REFERENCES bookings(booking_id) ON DELETE CASCADE,
    subtotal NUMERIC(10, 2) NOT NULL,
    tax NUMERIC(10, 2) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(30) DEFAULT 'UPI',
    payment_status VARCHAR(20) DEFAULT 'PAID',
    duration_text VARCHAR(100) NOT NULL,
    billed_hours INTEGER NOT NULL,
    paid_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_slots_location ON parking_slots(location_id);
CREATE INDEX IF NOT EXISTS idx_slots_status ON parking_slots(status);
CREATE INDEX IF NOT EXISTS idx_bookings_plate ON bookings(plate);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_active ON bookings(location_id, slot_id) WHERE status = 'active';"""

    code_tbl = doc.add_table(rows=1, cols=1)
    code_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_cell = code_tbl.cell(0, 0)
    set_cell_bg(c_cell, "1E293B") # Dark slate
    set_cell_padding(c_cell, top=140, bottom=140, left=180, right=180)
    p_code = c_cell.paragraphs[0]
    p_code.paragraph_format.space_before = Pt(2)
    p_code.paragraph_format.space_after = Pt(2)
    r_code = p_code.add_run(sql_code)
    r_code.font.name = 'Consolas'
    r_code.font.size = Pt(8.0)
    r_code.font.color.rgb = RGBColor(0xF1, 0xF5, 0xF9)

    # ==========================
    # SECTION 5: STEP-BY-STEP NODE.JS INTEGRATION
    # ==========================
    doc.add_page_break()
    doc.add_heading("5. Implementation Blueprint: Connecting Express to PostgreSQL", level=1)
    
    steps = [
        ("Step 1: Install PostgreSQL Driver", "Run npm install pg dotenv inside your project root (d:/COLLEGE/wad)."),
        ("Step 2: Add Environment Variables", "Add DATABASE_URL=postgresql://postgres:password@localhost:5432/parking_db to .env."),
        ("Step 3: Create Database Connection Pool", "Create server/db.js exporting a new pg.Pool connection instance."),
        ("Step 4: Seed Existing JSON Data", "Run an automatic migration script to transfer existing data from ahmedabad_parking.json into the PostgreSQL database."),
        ("Step 5: Replace File Reads with SQL Queries", "Replace fs.readFileSync/writeFileSync in server.js with pool.query('SELECT...') and pool.query('INSERT...')."),
    ]

    for title, desc in steps:
        p_step = doc.add_paragraph()
        p_step.paragraph_format.space_before = Pt(4)
        p_step.paragraph_format.space_after = Pt(2)
        r_num = p_step.add_run(f"✔ {title}: ")
        r_num.bold = True
        r_num.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)
        r_d = p_step.add_run(desc)

    p_end = doc.add_paragraph()
    p_end.paragraph_format.space_before = Pt(20)
    r_end = p_end.add_run("--- End of PostgreSQL Schema Specification Document ---")
    r_end.font.size = Pt(9.0)
    r_end.font.italic = True
    r_end.font.color.rgb = RGBColor(0x9C, 0xA3, 0xAF)
    p_end.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Save to file
    output_path = r"d:\COLLEGE\wad\PostgreSQL_Database_Design_Ahmedabad_Parking.docx"
    doc.save(output_path)
    print(f"Document successfully created at: {output_path}")

if __name__ == "__main__":
    create_document()
