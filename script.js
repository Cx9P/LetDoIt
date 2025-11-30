import { db, localUserId } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");
const addBtn = document.getElementById("add-btn");

// ==============================
// โหลด todos
// ==============================
async function loadTodos() {
  list.innerHTML = "";
  const ref = collection(db, "users", localUserId, "todos");
  const q = query(ref, orderBy("order", "asc"));
  const snapshot = await getDocs(q);

  snapshot.docs.forEach((docSnap, index) => {
    const data = docSnap.data();
    const li = createTodoItem(docSnap.id, data.text, index, data.done ?? false);
    list.appendChild(li);
  });
}

// ==============================
// สร้าง todo item
// ==============================
function createTodoItem(id, text, index, done) {
  const li = document.createElement("li");
  li.className = "item";
  li.dataset.id = id;
  li.style.userSelect = "none"; // ป้องกันเลือกข้อความบน iOS

  const numberSpan = document.createElement("span");
  numberSpan.className = "number";
  numberSpan.textContent = `${index + 1}.`;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = done;
  checkbox.onchange = async () => {
    await updateDoc(doc(db, "users", localUserId, "todos", id), { done: checkbox.checked });
    textSpan.style.textDecoration = checkbox.checked ? "line-through" : "none";
  };

  const textSpan = document.createElement("span");
  textSpan.className = "todo-text";
  textSpan.textContent = text;
  if (done) textSpan.style.textDecoration = "line-through";

  const delBtn = document.createElement("button");
  delBtn.textContent = "ลบ";
  delBtn.onclick = async () => {
    await deleteDoc(doc(db, "users", localUserId, "todos", id));
    loadTodos();
  };

  li.appendChild(numberSpan);
  li.appendChild(checkbox);
  li.appendChild(textSpan);
  li.appendChild(delBtn);

  enableDrag(li);

  return li;
}

// ==============================
// Drag & Drop รองรับ desktop & mobile พร้อม long press
// ==============================
function enableDrag(li) {
  let draggingEl, placeholder;
  let startY = 0;
  let longPressTimer;

  li.addEventListener("mousedown", startPress);
  li.addEventListener("touchstart", startPress, { passive: false });

  function startPress(e) {
    // ป้องกันกด checkbox / ปุ่ม
    if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;

    e.preventDefault();
    startY = e.touches ? e.touches[0].clientY : e.clientY;

    // ตั้ง long press 1.2 วินาที
    longPressTimer = setTimeout(() => {
      draggingEl = li;

      placeholder = document.createElement("li");
      placeholder.className = "placeholder";
      placeholder.style.height = draggingEl.offsetHeight + "px";
      draggingEl.parentNode.insertBefore(placeholder, draggingEl.nextSibling);

      draggingEl.classList.add("dragging");

      document.addEventListener("mousemove", dragMove);
      document.addEventListener("mouseup", dragEnd);
      document.addEventListener("touchmove", dragMove, { passive: false });
      document.addEventListener("touchend", dragEnd);
    }, 1200);
  }

  li.addEventListener("mouseup", cancelPress);
  li.addEventListener("mouseleave", cancelPress);
  li.addEventListener("touchend", cancelPress);
  li.addEventListener("touchcancel", cancelPress);

  function cancelPress() {
    clearTimeout(longPressTimer);
  }

  function dragMove(e) {
    if (!draggingEl) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    draggingEl.style.transform = `translateY(${y - startY}px)`;

    const after = getDragAfterElement(list, y);
    if (after == null) list.appendChild(placeholder);
    else list.insertBefore(placeholder, after);
  }

  async function dragEnd() {
    if (!draggingEl) return;

    draggingEl.classList.remove("dragging");
    draggingEl.style.transform = "";
    list.insertBefore(draggingEl, placeholder);
    placeholder.remove();

    draggingEl = null;
    placeholder = null;

    document.removeEventListener("mousemove", dragMove);
    document.removeEventListener("mouseup", dragEnd);
    document.removeEventListener("touchmove", dragMove);
    document.removeEventListener("touchend", dragEnd);

    await saveOrder();
    loadTodos();
  }
}

// ==============================
// หา element หลัง pointer
// ==============================
function getDragAfterElement(list, y) {
  const items = [...list.querySelectorAll(".item:not(.dragging)")];
  return items.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ==============================
// เพิ่มงานใหม่
// ==============================
addBtn.onclick = async () => {
  const text = input.value.trim();
  if (!text) return;

  const ref = collection(db, "users", localUserId, "todos");
  const snapshot = await getDocs(ref);
  const maxOrder = snapshot.docs.reduce((max, docSnap) => {
    const o = docSnap.data().order ?? 0;
    return o > max ? o : max;
  }, 0);

  await addDoc(ref, { text, order: maxOrder + 1, done: false });
  input.value = "";
  loadTodos();
};

// ==============================
// บันทึกลำดับ (Drag & Drop)
// ==============================
async function saveOrder() {
  const items = [...list.querySelectorAll(".item")];
  for (let i = 0; i < items.length; i++) {
    const id = items[i].dataset.id;
    await updateDoc(doc(db, "users", localUserId, "todos", id), { order: i + 1 });
  }
}

// ==============================
// โหลดเริ่มต้น
// ==============================
loadTodos();
