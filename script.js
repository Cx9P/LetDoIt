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
    await updateDoc(doc(db, "users", localUserId, "todos", id), {
      done: checkbox.checked,
    });
  };

  const textSpan = document.createElement("span");
  textSpan.textContent = text;
  textSpan.className = "todo-text";
  if (done) textSpan.style.textDecoration = "line-through";

  checkbox.addEventListener("change", () => {
    textSpan.style.textDecoration = checkbox.checked ? "line-through" : "none";
  });

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

  enableDrag(li); // รองรับทั้งคอมและมือถือ

  return li;
}

// ==============================
// Drag & Drop รองรับทั้งคอมและมือถือ
// ==============================
function enableDrag(li) {
  let dragging = false;
  let startY, startX;
  let placeholder;

  // === Desktop ===
  li.draggable = true;

  li.addEventListener("dragstart", (e) => {
    dragging = true;
    e.dataTransfer.effectAllowed = "move";
    li.classList.add("dragging");

    placeholder = document.createElement("li");
    placeholder.className = "placeholder";
    placeholder.style.height = li.offsetHeight + "px";

    li.parentNode.insertBefore(placeholder, li.nextSibling);
  });

  li.addEventListener("dragend", async () => {
    dragging = false;
    li.classList.remove("dragging");
    li.style.transform = "";

    list.insertBefore(li, placeholder);
    placeholder.remove();

    await saveOrder();
    loadTodos();
  });

  li.addEventListener("dragover", (e) => e.preventDefault());

  li.addEventListener("drop", (e) => e.preventDefault());

  // === Touch (iOS) ===
  li.addEventListener("touchstart", (e) => {
    startY = e.touches[0].clientY;
    startX = e.touches[0].clientX;
    dragging = true;

    li.classList.add("dragging");

    placeholder = document.createElement("li");
    placeholder.className = "placeholder";
    placeholder.style.height = li.offsetHeight + "px";

    li.parentNode.insertBefore(placeholder, li.nextSibling);
  });

  li.addEventListener("touchmove", (e) => {
    if (!dragging) return;
    e.preventDefault();

    const y = e.touches[0].clientY;
    li.style.transform = `translateY(${y - startY}px)`;

    const after = getDragAfterElement(list, y);
    if (after == null) list.appendChild(placeholder);
    else list.insertBefore(placeholder, after);
  });

  li.addEventListener("touchend", async () => {
    dragging = false;
    li.classList.remove("dragging");
    li.style.transform = "";

    list.insertBefore(li, placeholder);
    placeholder.remove();

    await saveOrder();
    loadTodos();
  });
}

// หา element หลัง pointer
function getDragAfterElement(list, y) {
  const items = [...list.querySelectorAll(".item:not(.dragging)")];

  return items.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
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
    await updateDoc(doc(db, "users", localUserId, "todos", id), {
      order: i + 1,
    });
  }
}

// โหลดเริ่มต้น
loadTodos();
