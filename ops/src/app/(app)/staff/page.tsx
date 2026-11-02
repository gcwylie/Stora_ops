import { redirect } from "next/navigation";
import { saveEmployee } from "@/lib/actions";
import { requireUser } from "@/lib/access";
import { roster } from "@/lib/load";
import { GROUPS, SHOPS } from "@/lib/shops";

export default async function StaffPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  const people = await roster();
  return (
    <>
      <div className="hint">
        Pay rates on this page are visible to shop managers on Schema for their own shop. Caspeco ids are what the draft-shift export matches on. Salary people stay outside the FOH cost until a kr/h is typed.
      </div>
      <div className="card">
        <h2>Add a person</h2>
        <EmployeeForm />
      </div>
      <div className="board">
        <table className="staff-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Group</th>
              <th>Home</th>
              <th>Also</th>
              <th>kr/h</th>
              <th>Caspeco</th>
              <th>Salary</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.id}>
                <td colSpan={9}>
                  <EmployeeForm person={person} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function EmployeeForm({
  person,
}: {
  person?: {
    id: string;
    name: string;
    groupName: string;
    homeShopCode: string;
    alsoShopCode: string | null;
    hourlyRate: number | null;
    caspecoEmployeeId: string | null;
    salary: boolean;
    active: boolean;
  };
}) {
  return (
    <form action={saveEmployee} className="field-row">
      {person ? <input type="hidden" name="id" value={person.id} /> : null}
      <label className="field">
        Name
        <input name="name" defaultValue={person?.name || ""} required />
      </label>
      <label className="field">
        Group
        <select name="group" defaultValue={person?.groupName || "FOH"}>
          {GROUPS.map((group) => (
            <option key={group}>{group}</option>
          ))}
        </select>
      </label>
      <label className="field">
        Home shop
        <select name="homeShop" defaultValue={person?.homeShopCode || "SIB2"}>
          {SHOPS.map((shop) => (
            <option key={shop.code} value={shop.code}>
              {shop.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Also works
        <select name="alsoShop" defaultValue={person?.alsoShopCode || ""}>
          <option value="">—</option>
          {SHOPS.map((shop) => (
            <option key={shop.code} value={shop.code}>
              {shop.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        kr/h
        <input name="hourlyRate" inputMode="decimal" defaultValue={person?.hourlyRate ?? ""} />
      </label>
      <label className="field">
        Caspeco id
        <input name="caspecoEmployeeId" defaultValue={person?.caspecoEmployeeId || ""} />
      </label>
      <label className="field">
        <span>Salary</span>
        <input type="checkbox" name="salary" defaultChecked={person?.salary || false} />
      </label>
      <label className="field">
        <span>Active</span>
        <input type="checkbox" name="active" defaultChecked={person ? person.active : true} value="on" />
      </label>
      <button className="btn btn-navy" type="submit">
        {person ? "Save" : "Add"}
      </button>
    </form>
  );
}
