import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

async function createSamplePdfs() {
  const samplesDir = path.resolve(__dirname, '../../test_samples');
  await fs.mkdir(samplesDir, { recursive: true });

  // 1. Create 16:9 Landscape PDF (960 x 540)
  {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);
    const subFont = await pdf.embedFont(StandardFonts.Helvetica);

    for (let i = 1; i <= 3; i++) {
      const page = pdf.addPage([960, 540]);
      // Background gradient or border
      page.drawRectangle({
        x: 20,
        y: 20,
        width: 920,
        height: 500,
        borderColor: rgb(0.3, 0.4, 0.9),
        borderWidth: 3,
        color: rgb(0.97, 0.98, 1.0),
      });

      page.drawText(`16:9 Slide ${i}: Presentation Deck`, {
        x: 60,
        y: 450,
        size: 32,
        font,
        color: rgb(0.1, 0.15, 0.3),
      });

      page.drawText(`This is page ${i} of 3 in a widescreen 16:9 presentation.`, {
        x: 60,
        y: 390,
        size: 18,
        font: subFont,
        color: rgb(0.3, 0.35, 0.4),
      });

      page.drawRectangle({
        x: 60,
        y: 120,
        width: 360,
        height: 200,
        color: rgb(0.9, 0.93, 0.98),
        borderColor: rgb(0.6, 0.7, 0.9),
        borderWidth: 1.5,
      });

      page.drawText(`Target Zone A (Slide ${i})`, {
        x: 80,
        y: 280,
        size: 16,
        font,
        color: rgb(0.2, 0.3, 0.6),
      });
    }

    const bytes = await pdf.save();
    await fs.writeFile(path.join(samplesDir, 'presentation_16x9.pdf'), bytes);
    console.log('Created presentation_16x9.pdf');
  }

  // 2. Create 4:3 PDF (1024 x 768)
  {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);
    const subFont = await pdf.embedFont(StandardFonts.Helvetica);

    for (let i = 1; i <= 3; i++) {
      const page = pdf.addPage([1024, 768]);
      page.drawRectangle({
        x: 20,
        y: 20,
        width: 984,
        height: 728,
        borderColor: rgb(0.8, 0.4, 0.1),
        borderWidth: 3,
        color: rgb(1.0, 0.98, 0.95),
      });

      page.drawText(`4:3 Slide ${i}: Standard Pitch`, {
        x: 60,
        y: 680,
        size: 32,
        font,
        color: rgb(0.3, 0.15, 0.05),
      });

      page.drawText(`This is page ${i} of 3 in a 4:3 slide deck (letterboxed horizontally).`, {
        x: 60,
        y: 620,
        size: 18,
        font: subFont,
        color: rgb(0.4, 0.3, 0.2),
      });

      page.drawRectangle({
        x: 100,
        y: 200,
        width: 400,
        height: 300,
        color: rgb(0.98, 0.92, 0.85),
        borderColor: rgb(0.8, 0.5, 0.2),
        borderWidth: 1.5,
      });

      page.drawText(`Target Zone 4:3 (Slide ${i})`, {
        x: 120,
        y: 440,
        size: 16,
        font,
        color: rgb(0.5, 0.25, 0.1),
      });
    }

    const bytes = await pdf.save();
    await fs.writeFile(path.join(samplesDir, 'presentation_4x3.pdf'), bytes);
    console.log('Created presentation_4x3.pdf');
  }

  // 3. Create A4 Portrait PDF (595 x 842)
  {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);
    const subFont = await pdf.embedFont(StandardFonts.Helvetica);

    for (let i = 1; i <= 3; i++) {
      const page = pdf.addPage([595.28, 841.89]);
      page.drawRectangle({
        x: 15,
        y: 15,
        width: 565,
        height: 811,
        borderColor: rgb(0.1, 0.6, 0.4),
        borderWidth: 2,
        color: rgb(0.96, 1.0, 0.98),
      });

      page.drawText(`Document Page ${i} (Portrait)`, {
        x: 40,
        y: 780,
        size: 26,
        font,
        color: rgb(0.05, 0.3, 0.2),
      });

      page.drawText(`Page ${i} of 3 - A4 Portrait Document`, {
        x: 40,
        y: 740,
        size: 14,
        font: subFont,
        color: rgb(0.2, 0.4, 0.3),
      });

      page.drawRectangle({
        x: 40,
        y: 400,
        width: 300,
        height: 250,
        color: rgb(0.9, 0.97, 0.93),
        borderColor: rgb(0.2, 0.6, 0.4),
        borderWidth: 1.5,
      });

      page.drawText(`Portrait Target Box (Page ${i})`, {
        x: 55,
        y: 600,
        size: 14,
        font,
        color: rgb(0.1, 0.4, 0.25),
      });
    }

    const bytes = await pdf.save();
    await fs.writeFile(path.join(samplesDir, 'document_portrait.pdf'), bytes);
    console.log('Created document_portrait.pdf');
  }
}

createSamplePdfs().catch(console.error);
