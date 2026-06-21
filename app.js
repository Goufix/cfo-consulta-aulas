import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js';
import {
  collection,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  where,
} from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDrc3DLn2JEPTeSKDcqHfW1W8DPv7ULljk",
  authDomain: "cfo-rcc.firebaseapp.com",
  projectId: "cfo-rcc",
  storageBucket: "cfo-rcc.firebasestorage.app",
  messagingSenderId: "24971821973",
  appId: "1:24971821973:web:4f9c82f534f05d068f2c9c",
  measurementId: "G-337KCSYFJM"
};

const ATTENDANCES_COLLECTION_NAME = 'classAttendances';
const EVALUATIONS_COLLECTION_NAME = 'evaluations';
const CLASS_NAMES = [
  'Administração e Tecnologia do Fórum',
  'Ciências Militares',
  'Carreira Militar',
  'Práticas Militares e Legislação',
];
const MAX_RESULTS = 200;

const searchForm = document.querySelector('#search-form');
const studentInput = document.querySelector('#student-input');
const studentName = document.querySelector('#student-name');
const resultStatus = document.querySelector('#result-status');
const classesGrid = document.querySelector('#classes-grid');
const totalRecords = document.querySelector('#total-records');
const studentAvatar = document.querySelector('#student-avatar');
const evaluationsList = document.querySelector('#evaluations-list');

const app = initializeApp(firebaseConfig);
const database = getFirestore(app);

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

function setStatus(message, variant) {
  resultStatus.textContent = message;
  resultStatus.classList.toggle('error', variant === 'error');
}

function formatDate(value) {
  if (!value) return 'Data não informada';

  const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  function formatDateParts(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day} ${month} ${year} ${hours}:${minutes}`;
  }

  if (typeof value.toDate === 'function') {
    return formatDateParts(value.toDate());
  }

  const brazilianDateMatch = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/);

  if (brazilianDateMatch) {
    const [, day, month, year, hours, minutes] = brazilianDateMatch;

    return `${day} ${monthNames[Number(month) - 1]} ${year} ${hours}:${minutes}`;
  }

  return value;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function groupByClass(records) {
  return CLASS_NAMES.reduce((accumulator, className) => {
    accumulator[className] = records.filter((record) => record.class === className);
    return accumulator;
  }, {});
}

function renderClassCard(className, records) {
  const listItems = records
    .map((record) => {
      const date = escapeHtml(formatDate(record.classDate || record.date));
      const professor = escapeHtml(record.professor);
      const type = String(record.type || '').trim();
      const typeKey = normalizeKey(type);
      const status = String(record.status || '').trim();
      const statusKey = normalizeKey(status);
      const comments = String(record.comments || '').trim();
      const statusClass = status
        ? statusKey.includes('aprovado')
          ? 'approved'
          : 'failed'
        : '';
      const typeBadge = type
        ? `<strong class="lesson-type ${typeKey === 'atividade' ? 'activity' : 'class'}">${escapeHtml(type)}</strong>`
        : '';
      const commentsTooltip = comments ? `<span class="lesson-comments">${escapeHtml(comments)}</span>` : '';

      return `
        <li class="${statusClass}">
          <div class="lesson-meta">
            <time>${date}</time>
            <span class="lesson-badges">${typeBadge}</span>
          </div>
          <span>Professor: <strong>${professor}</strong></span>
          ${commentsTooltip}
        </li>
      `;
    })
    .join('');

  return `
    <article class="class-card">
      <header>
        <h3>${className}</h3>
        <span class="class-count">${records.length}</span>
      </header>
      ${records.length > 0 ? `<ul class="class-list">${listItems}</ul>` : '<div class="empty-state">Não encontrado.</div>'}
    </article>
  `;
}

function renderResults(records) {
  const recordsByClass = groupByClass(records);

  classesGrid.innerHTML = CLASS_NAMES.map((className) => renderClassCard(className, recordsByClass[className])).join('');
}

function getResultClass(resultKey) {
  if (resultKey === 'aprovado') return 'approved';
  if (resultKey === 'reprovado') return 'failed';

  return 'unknown';
}

function renderEvaluations(records) {
  if (records.length === 0) {
    evaluationsList.innerHTML = '<div class="assessment-card"><strong>Não encontrado.</strong><span>Nenhuma avaliação localizada para este aluno.</span></div>';
    return;
  }

  evaluationsList.innerHTML = records
    .map((record) => {
      const date = escapeHtml(formatDate(record.evaluationDate || record.date));
      const evaluator = escapeHtml(record.evaluator);
      const result = escapeHtml(record.result);
      const resultClass = getResultClass(record.resultKey);

      return `
        <article class="evaluation-item ${resultClass}">
          <div>
            <time>${date}</time>
            <span>Avaliador: <strong>${evaluator}</strong></span>
          </div>
          <strong class="evaluation-result">${result}</strong>
        </article>
      `;
    })
    .join('');
}

async function searchStudent(rawStudent) {
  const studentKey = normalizeKey(rawStudent);

  if (!studentKey) {
    setStatus('Informe um aluno', 'error');
    return;
  }

  const button = searchForm.querySelector('button');
  button.disabled = true;
  setStatus('Pesquisando');
  studentName.textContent = rawStudent.trim();
  studentAvatar.src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(studentKey)}&direction=2&head_direction=2&size=m`;

  try {
    const attendanceQuery = query(
      collection(database, ATTENDANCES_COLLECTION_NAME),
      where('studentKey', '==', studentKey),
      orderBy('classDate', 'desc'),
      limit(MAX_RESULTS),
    );
    const evaluationQuery = query(
      collection(database, EVALUATIONS_COLLECTION_NAME),
      where('evaluatedKey', '==', studentKey),
      orderBy('evaluationDate', 'desc'),
      limit(MAX_RESULTS),
    );
    const [attendanceSnapshot, evaluationSnapshot] = await Promise.all([getDocs(attendanceQuery), getDocs(evaluationQuery)]);
    const records = attendanceSnapshot.docs.map((documentSnapshot) => documentSnapshot.data());
    const evaluations = evaluationSnapshot.docs.map((documentSnapshot) => documentSnapshot.data());

    renderResults(records);
    renderEvaluations(evaluations);
    setStatus(`${records.length} aulas / ${evaluations.length} avaliações`);
  } catch (error) {
    console.error(error);
    setStatus('Erro na consulta', 'error');
  } finally {
    button.disabled = false;
  }
}

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  searchStudent(studentInput.value);
});

renderResults([]);
renderEvaluations([]);
totalRecords.textContent = '8.733';
