/**
 * AutoForm Pro — Campo Field Map
 * 
 * Maps canonical field keys to arrays of aliases (normalized to lowercase).
 * When a form label matches any alias, we use the stored value for that key.
 */
const FIELD_MAP = {
  name: [
    'name', 'nombre', 'full name', 'nombre completo', 'your name', 'tu nombre',
    'fullname', 'full_name', 'nombre y apellido', 'first and last name',
    'applicant name', 'candidate name', '_systemfield_name', 'nombre legal'
  ],
  first_name: [
    'first name', 'nombre', 'firstname', 'given name', 'first', 'nombre de pila',
    'first_name', 'fname', 'tu nombre', 'your first name'
  ],
  last_name: [
    'last name', 'apellido', 'lastname', 'surname', 'family name', 'last',
    'last_name', 'lname', 'apellidos', 'your last name'
  ],
  email: [
    'email', 'correo', 'e-mail', 'correo electrónico', 'mail', 'email address',
    'your email', 'tu correo', 'dirección de correo', 'email address',
    '_systemfield_email', 'work email', 'personal email'
  ],
  phone: [
    'phone', 'teléfono', 'telefono', 'phone number', 'número de teléfono',
    'numero de telefono', 'mobile', 'cel', 'celular', 'cell', 'mobile number',
    'contact number', 'your phone', 'tu teléfono', 'tel'
  ],
  linkedin: [
    'linkedin', 'linkedin url', 'linkedin profile', 'perfil de linkedin',
    'linkedin link', 'linkedin profile url', 'url de linkedin'
  ],
  github: [
    'github', 'github url', 'github profile', 'github link', 'perfil de github'
  ],
  portfolio: [
    'portfolio', 'portfolio url', 'website', 'sitio web', 'personal website',
    'web', 'url', 'personal site', 'your website'
  ],
  location: [
    'location', 'ubicación', 'ubicacion', 'ciudad', 'city', 'country', 'país',
    'pais', 'where are you located', 'where do you live', 'city, state',
    'city/state', 'region', 'address', 'dirección'
  ],
  salary: [
    'salary', 'salario', 'expected salary', 'salario esperado', 'salary expectation',
    'compensation', 'compensación', 'desired salary', 'pay expectation'
  ],
  start_date: [
    'start date', 'fecha de inicio', 'availability', 'available from',
    'when can you start', 'earliest start date', 'start', 'disponibilidad'
  ],
  cover_letter: [
    'cover letter', 'carta de presentación', 'carta de presentacion',
    'motivation letter', 'why do you want', 'why work here', 'about you',
    'message', 'additional information', 'notes'
  ],
  university: [
    'university', 'universidad', 'school', 'college', 'institution',
    'alma mater', 'education', 'educación'
  ],
  degree: [
    'degree', 'título', 'titulo', 'major', 'field of study', 'carrera',
    'specialization', 'especialización'
  ],
  company: [
    'company', 'empresa', 'current company', 'employer', 'organization',
    'current employer', 'where do you work'
  ],
  title: [
    'title', 'cargo', 'job title', 'current title', 'position', 'puesto',
    'current position', 'role', 'current role'
  ],
  years_experience: [
    'years of experience', 'años de experiencia', 'experience', 'experiencia',
    'years experience', 'how many years'
  ]
};

/**
 * Normalize a string for comparison: lowercase, trim, collapse whitespace.
 */
function normalize(str) {
  return (str || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/[_\-]/g, ' ');
}

/**
 * Given a label from a web page, return the canonical field key or null.
 */
function getCanonicalKey(label) {
  const norm = normalize(label);
  for (const [key, aliases] of Object.entries(FIELD_MAP)) {
    for (const alias of aliases) {
      if (norm === alias || norm.includes(alias) || alias.includes(norm)) {
        return key;
      }
    }
  }
  // Fallback: return a slugified version of the label itself
  return 'custom_' + norm.replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 30);
}

// Expose globally for use in sidebar.js
window.AutoFormFieldMap = { FIELD_MAP, normalize, getCanonicalKey };
