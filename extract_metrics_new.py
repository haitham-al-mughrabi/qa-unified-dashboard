"""
Performance Metrics Extractor - Ultimate Version
================================================
Features:
1. Universal Color Support (Green/Yellow/Red)
2. Dynamic & Safe Pairing (No hardcoded numbers)
3. Duplicate Image Removal (MD5 Hashing)
4. Advanced Decimal Scoring (Prioritizes 6.53 over 6)
5. VISUAL HTML REPORT for verification
"""

import os
import docx2txt
from docx import Document
from docx.oxml.text.paragraph import CT_P
import easyocr
from PIL import Image, ImageEnhance
import numpy as np
import json
import re
import csv
import hashlib

def natural_sort_key(filename):
    """Sorts 'image10.png' after 'image2.png'"""
    parts = re.split(r'(\d+)', filename)
    return [int(part) if part.isdigit() else part.lower() for part in parts]


class UniversalExtractorWithReport:
    """Production extractor with full reporting capabilities"""

    def __init__(self, docx_path, output_dir='extracted_data'):
        self.docx_path = docx_path
        self.output_dir = output_dir
        self.images_dir = os.path.join(output_dir, 'images')
        self.debug_dir = os.path.join(output_dir, 'debug')

        print("Initializing EasyOCR...")
        self.reader = easyocr.Reader(['en'], gpu=False, verbose=False)
        print("✓ Ready\n")

        for d in [self.output_dir, self.images_dir, self.debug_dir]:
            os.makedirs(d, exist_ok=True)

    def extract_titles_from_docx(self):
        """Dynamically extracts titles"""
        try:
            from docx.text.paragraph import Paragraph
            doc = Document(self.docx_path)
            titles = []
            for element in doc.element.body:
                if isinstance(element, CT_P):
                    para = Paragraph(element, doc)
                    text = para.text.strip()
                    if text and (re.search(r'[–-]\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)', text, re.IGNORECASE) or
                                text.endswith(':')):
                        clean = text.strip()
                        if len(clean) < 100: titles.append(clean)
            return titles
        except Exception as e:
            print(f"  ⚠️  Title extraction error: {e}")
            return []

    def extract_and_deduplicate_images(self):
        """Extracts and removes duplicates"""
        print("Extracting images...")
        docx2txt.process(self.docx_path, self.images_dir)

        all_files = sorted([f for f in os.listdir(self.images_dir) 
                          if f.lower().endswith(('.png', '.jpg', '.jpeg'))],
                          key=natural_sort_key)

        unique_files = []
        seen_hashes = set()

        for filename in all_files:
            filepath = os.path.join(self.images_dir, filename)
            with open(filepath, 'rb') as f:
                file_hash = hashlib.md5(f.read()).hexdigest()

            if file_hash not in seen_hashes:
                seen_hashes.add(file_hash)
                unique_files.append(filename)

        return unique_files

    def preprocess_image(self, image_path, base_name):
        """Universal preprocessing (Grayscale -> Contrast -> Scale)"""
        img = Image.open(image_path).convert('L')
        enhancer = ImageEnhance.Contrast(img).enhance(2.5)
        w, h = enhancer.size
        scaled = enhancer.resize((w * 3, h * 3), Image.LANCZOS)

        # Save debug image for HTML report
        debug_path = os.path.join(self.debug_dir, f'{base_name}_processed.png')
        scaled.save(debug_path)

        return scaled

    def score_candidate(self, value, text, area, confidence):
        """Scoring logic"""
        score = 0
        if '.' in str(value): score += 1000
        score += area / 10000
        score += confidence * 5
        if 2020 <= value <= 2030: score -= 10000
        if value < 0.01 or value > 10000: score -= 1000
        if re.search(r'ms|seconds?|%', text, re.IGNORECASE): score += 50
        return score

    def extract_metric_value(self, image_path, base_name):
        """Extracts value and returns debug info"""
        debug_info = {
            'processed_image': f'debug/{base_name}_processed.png',
            'ocr_text': [],
            'candidates': [],
            'selection_reason': ''
        }

        try:
            processed = self.preprocess_image(image_path, base_name)
            ocr_raw = self.reader.readtext(np.array(processed), detail=1)

            if not ocr_raw:
                debug_info['selection_reason'] = "No text detected by OCR"
                return None, debug_info

            # Record raw OCR for report
            debug_info['ocr_text'] = [
                {'text': text, 'conf': float(conf * 100)} 
                for _, text, conf in ocr_raw
            ]

            candidates = []
            for bbox, text, confidence in ocr_raw:
                for num_str in re.findall(r'([0-9]+\.?[0-9]*)', text):
                    try:
                        value = float(num_str)
                        pts = np.array(bbox)
                        area = (np.max(pts[:, 0]) - np.min(pts[:, 0])) * (np.max(pts[:, 1]) - np.min(pts[:, 1]))
                        score = self.score_candidate(value, text, area, confidence)

                        candidates.append({
                            'value': value,
                            'text': text,
                            'score': float(score),
                            'area': float(area),
                            'conf': float(confidence * 100)
                        })
                    except: continue

            debug_info['candidates'] = candidates

            if not candidates:
                debug_info['selection_reason'] = "No valid numbers found in text"
                return None, debug_info

            # Sort by score
            candidates.sort(key=lambda x: x['score'], reverse=True)
            best = candidates[0]
            debug_info['selection_reason'] = f"Highest Score: {best['score']:.1f} (Decimal: {'.' in str(best['value'])})"

            return best['value'], debug_info

        except Exception as e:
            debug_info['selection_reason'] = f"Error: {str(e)}"
            return None, debug_info

    def process_document(self):
        """Main processing loop"""
        titles = self.extract_titles_from_docx()
        image_files = self.extract_and_deduplicate_images()

        results = []
        print("="*60)
        print(f"Processing {len(image_files)} unique images with {len(titles)} titles...")
        print("="*60)

        for idx, (title, image_file) in enumerate(zip(titles, image_files)):
            base_name = os.path.splitext(image_file)[0]
            print(f"[{idx+1}] {title}...", end=" ")

            value, info = self.extract_metric_value(
                os.path.join(self.images_dir, image_file), 
                base_name
            )

            results.append({
                'id': idx + 1,
                'title': title,
                'value': value,
                'image_file': image_file,
                'debug_info': info
            })
            print(f"✓ {value}" if value is not None else "✗ No Value")

        return results

    def generate_html_report(self, results):
        """Generates the visual HTML report"""
        html = """<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Extraction Debug Report</title>
    <style>
        body { font-family: sans-serif; background: #f4f6f8; padding: 20px; }
        .card { background: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px; }
        .value-box { font-size: 24px; font-weight: bold; padding: 5px 15px; border-radius: 4px; }
        .success { background: #d4edda; color: #155724; }
        .failure { background: #f8d7da; color: #721c24; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .img-container { text-align: center; border: 1px solid #eee; padding: 10px; border-radius: 4px; }
        img { max-width: 100%; height: auto; }
        .debug-section { margin-top: 15px; background: #f8f9fa; padding: 15px; border-radius: 4px; font-size: 13px; }
        .candidate { display: flex; justify-content: space-between; padding: 5px; border-bottom: 1px solid #eee; }
        .candidate.selected { background: #e8f5e9; font-weight: bold; border-left: 3px solid #28a745; }
    </style>
</head>
<body>
    <h1>📊 Extraction Debug Report</h1>
"""
        for r in results:
            val_display = str(r['value']) if r['value'] is not None else "FAILED"
            status_class = "success" if r['value'] is not None else "failure"

            html += f"""
    <div class="card">
        <div class="header">
            <h3>#{r['id']} {r['title']}</h3>
            <div class="value-box {status_class}">{val_display}</div>
        </div>

        <div class="grid">
            <div class="img-container">
                <strong>Original Image</strong><br>
                <img src="images/{r['image_file']}">
            </div>
            <div class="img-container">
                <strong>Processed for OCR</strong><br>
                <img src="{r['debug_info']['processed_image']}">
            </div>
        </div>

        <div class="debug-section">
            <strong>🏆 Selection Reason:</strong> {r['debug_info']['selection_reason']}<br><br>
            <strong>🔢 Top 5 Candidates:</strong>
            <div style="margin-top:5px; border:1px solid #ddd; background:white;">
"""
            # List top candidates
            for c in r['debug_info']['candidates'][:5]:
                is_selected = (c['value'] == r['value'])
                sel_class = "selected" if is_selected else ""
                html += f"""
                <div class="candidate {sel_class}">
                    <span>Val: {c['value']} (from "{c['text']}")</span>
                    <span>Score: {c['score']:.0f} | Area: {c['area']:.0f}</span>
                </div>"""

            html += """
            </div>
        </div>
    </div>"""

        html += "</body></html>"

        with open(os.path.join(self.output_dir, 'report.html'), 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"📄 HTML Report: {os.path.join(self.output_dir, 'report.html')}")

    def save_results(self, results):
        """Saves all outputs"""
        # JSON/CSV
        export_data = [{'title': r['title'], 'value': r['value']} for r in results]

        with open(os.path.join(self.output_dir, 'results.json'), 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)

        with open(os.path.join(self.output_dir, 'results.csv'), 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['title', 'value'])
            writer.writeheader()
            writer.writerows(export_data)

        print(f"💾 Data saved: results.json, results.csv")

        # HTML
        self.generate_html_report(results)

def main():
    import sys
    if len(sys.argv) < 2: sys.exit("Usage: python extract_metrics.py <docx_file>")
    if not os.path.exists(sys.argv[1]): sys.exit(f"Error: File not found: {sys.argv[1]}")

    extractor = UniversalExtractorWithReport(sys.argv[1])
    results = extractor.process_document()
    extractor.save_results(results)
    print("\n🚀 Complete!")

if __name__ == "__main__":
    main()
