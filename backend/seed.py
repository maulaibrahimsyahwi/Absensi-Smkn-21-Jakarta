from app import app, db
from models import Siswa
import json

def seed():
    with app.app_context():
        db.create_all()
        # Check if already seeded
        if Siswa.query.first():
            print("Database already seeded")
            return
        siswa_samples = [
            {"nis": "21001", "nama": "Budi Santoso", "kelas": "XII PPLG 1"},
            {"nis": "21002", "nama": "Siti Nurhaliza", "kelas": "XI AKL 1"},
            {"nis": "21003", "nama": "Ahmad Fauzi", "kelas": "X MPLB 2"},
            {"nis": "21004", "nama": "Dewi Lestari", "kelas": "XII BR 1"},
        ]
        for s in siswa_samples:
            siswa = Siswa(nis=s["nis"], nama=s["nama"], kelas=s["kelas"])
            siswa.face_encoding = json.dumps([0.1] * 128)
            db.session.add(siswa)
        db.session.commit()
        print(f"Database seeded with {len(siswa_samples)} SMKN 21 students across PPLG, AKL, MPLB, BR.")

if __name__ == '__main__':
    seed()
