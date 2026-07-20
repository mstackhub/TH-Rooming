import { NextResponse } from 'next/server';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const BRANDS_LIST = [
  "Fineline - AI",
  "Fineline",
  "Tros",
  "Benice",
  "Dnee",
  "Jabs-Beauty",
  "Eversense",
  "Babimild",
  "Jabs-Tissue",
  "DNEE FB+SHP",
  "BioSafety",
  "Bonny bliss",
  "Big C",
  "Neo Beauty",
  "BetagroPet",
  "BEO",
  "Yassia",
  "Taupe",
  "Glory",
  "TandT",
  "Aristotle",
  "Hi-Q",
  "Oceanglass",
  "Kemissara",
  "Foremost",
  "Bostanten",
  "Club21",
  "Evony",
  "Subi",
  "Royal Canin"
];

async function getExistingBrands() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_KEY in environment variables.");
  }
  const url = `${supabaseUrl}/rest/v1/brands?select=name`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase fetch error ${res.status}: ${text}`);
  }
  return res.json();
}

async function postSupabase(path: string, data: any) {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_KEY in environment variables.");
  }
  const url = `${supabaseUrl}/rest/v1/${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error ${res.status}: ${text}`);
  }
  return { success: true };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (!secret || secret !== 'migrate1234') {
    return NextResponse.json({ success: false, message: 'Forbidden. Invalid secret code.' }, { status: 403 });
  }

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ success: false, message: 'Missing SUPABASE_URL or SUPABASE_KEY.' }, { status: 500 });
  }

  try {
    // 1. Fetch existing brands in database
    const existing = await getExistingBrands();
    const existingNames = new Set(existing.map((b: any) => b.name.toLowerCase()));

    // 2. Filter out already existing brands
    const newBrandsToInsert = BRANDS_LIST.filter(name => !existingNames.has(name.toLowerCase()));

    if (newBrandsToInsert.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All brands already exist in database. No new brands imported.',
        brandsImported: []
      });
    }

    const payload = newBrandsToInsert.map(name => ({
      name,
      description: '',
      status: 'Active'
    }));

    await postSupabase('brands', payload);

    return NextResponse.json({
      success: true,
      message: `Successfully seeded/imported ${newBrandsToInsert.length} new brands to Supabase!`,
      brandsImported: newBrandsToInsert
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: 'Import failed: ' + err.message }, { status: 500 });
  }
}
