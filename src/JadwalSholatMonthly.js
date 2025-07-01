import { useEffect, useState } from "react"

// Indonesian day names mapping
const INDONESIAN_DAYS = {
    Sunday: "Minggu",
    Monday: "Senin",
    Tuesday: "Selasa",
    Wednesday: "Rabu",
    Thursday: "Kamis",
    Friday: "Jumat",
    Saturday: "Sabtu",
}

const timeToMinutes = (time) => {
    if (!time) return 0
    // Ambil 5 karakter pertama (HH:MM) untuk membuang "(WIB)" atau info lainnya
    const cleanTime = time.slice(0, 5)
    const [hours, minutes] = cleanTime.split(":").map(Number)
    
    // Fallback untuk memastikan tidak menghasilkan NaN
    if (isNaN(hours) || isNaN(minutes)) {
        return 0
    }
    return hours * 60 + minutes
}

const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
}

export function JadwalSholatMonthly() {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [timeLeft, setTimeLeft] = useState("")
    const [nextPrayer, setNextPrayer] = useState("")
    const [todayTimings, setTodayTimings] = useState({})
    const [isMobile, setIsMobile] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [suggestions, setSuggestions] = useState([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [city, setCity] = useState("Bandung")
    const country = "Indonesia"
    const today = new Date().toISOString().split("T")[0]

    // Get current month and year dynamically
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1

    // Sample list of major Indonesian cities for suggestions
    const indonesianCities = [
        "Bandung", "Jakarta", "Surabaya", "Medan", "Bekasi", "Depok", 
        "Tangerang", "Semarang", "Makassar", "Palembang", "Batam", 
        "Bogor", "Pekanbaru", "Bandar Lampung", "Malang", "Padang", 
        "Denpasar", "Samarinda", "Tasikmalaya", "Serang", "Balikpapan",
        "Banjarmasin", "Pontianak", "Cimahi", "Sukabumi", "Manado", 
        "Yogyakarta", "Cirebon", "Bengkulu", "Pematangsiantar", "Banda Aceh",
        "Jayapura", "Pekalongan", "Tegal", "Kediri", "Binjai", "Purwokerto",
        "Probolinggo", "Madiun", "Salatiga", "Lhokseumawe", "Cilegon", 
        "Mataram", "Parepare", "Prabumulih", "Palu", "Ambon", "Batu", 
        "Singkawang", "Blitar", "Tanjungpinang", "Sibolga", "Gorontalo",
        "Mojokerto", "Magelang", "Bukittinggi", "Ternate", "Kupang",
        "Tidore Kepulauan", "Bontang", "Metro", "Sabang", "Bitung"
    ]

    useEffect(() => {
        // Only run this on client-side
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768)
        }

        // Set initial mobile state
        setIsMobile(window.innerWidth < 768)

        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    useEffect(() => {
        const fetchMonthlySchedule = async () => {
            try {
                setLoading(true)
                const res = await fetch(
                    `https://api.aladhan.com/v1/calendarByCity?city=${city}&country=${country}&method=20&month=${currentMonth}&year=${currentYear}`
                )
                const json = await res.json()

                if (json.data) {
                    // Proses data untuk menambahkan waktu Dhuha ke setiap hari
                    const dataWithDhuha = json.data.map((day) => {
                        const { timings } = day
                        const sunriseMinutes = timeToMinutes(timings.Sunrise)
                        const dhuhrMinutes = timeToMinutes(timings.Dhuhr)
                        const dhuhaMinutes = (sunriseMinutes + dhuhrMinutes) / 2
                        const dhuhaTime = minutesToTime(dhuhaMinutes)

                        return {
                            ...day,
                            timings: {
                                ...timings,
                                Dhuha: dhuhaTime,
                            },
                        }
                    })

                    setData(dataWithDhuha)
                    setLoading(false)

                    // Cari jadwal hari ini dari data yang sudah dimodifikasi
                    const todayEntry = dataWithDhuha.find((d) => {
                        const [day, month, year] = d.date.gregorian.date.split("-")
                        const formatted = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
                        return formatted === today
                    })
                    if (todayEntry) {
                        setTodayTimings(todayEntry.timings)
                        calculateNextPrayer(todayEntry.timings)
                    }
                }
            } catch (err) {
                console.error("Error fetching prayer times", err)
                setLoading(false)
            }
        }

        fetchMonthlySchedule()
    }, [city, currentMonth, currentYear, today])

    useEffect(() => {
        const interval = setInterval(() => {
            if (todayTimings && Object.keys(todayTimings).length > 0) {
                calculateNextPrayer(todayTimings)
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [todayTimings])

    const calculateNextPrayer = (timings) => {
        const now = new Date()
        const prayerNames = ["Fajr", "Sunrise", "Dhuha", "Dhuhr", "Asr", "Maghrib", "Isha"]
        const prayerLabels = {
            Fajr: "Subuh",
            Sunrise: "Terbit",
            Dhuha: "Dhuha",
            Dhuhr: "Dzuhur",
            Asr: "Ashar",
            Maghrib: "Maghrib",
            Isha: "Isya",
        }

        for (let name of prayerNames) {
            if (timings[name]) {
                const [h, m] = timings[name].slice(0, 5).split(":").map(Number)
                const prayerTime = new Date(now)
                prayerTime.setHours(h, m, 0, 0)

                if (now < prayerTime) {
                    const diffMs = prayerTime - now
                    const hrs = Math.floor(diffMs / 1000 / 60 / 60)
                    const mins = Math.floor((diffMs / 1000 / 60) % 60)
                    setNextPrayer(prayerLabels[name] || name)
                    setTimeLeft(
                        `${hrs.toString().padStart(2, "0")} jam ${mins.toString().padStart(2, "0")} menit`
                    )
                    return
                }
            }
        }

        setNextPrayer("Subuh")
        setTimeLeft("Besok")
    }

    const handleSearchChange = (e) => {
        const query = e.target.value
        setSearchQuery(query)
        
        if (query.length > 1) {
            const filtered = indonesianCities.filter(city => 
                city.toLowerCase().includes(query.toLowerCase())
            )
            setSuggestions(filtered)
            setShowSuggestions(true)
        } else {
            setSuggestions([])
            setShowSuggestions(false)
        }
    }

    const handleCitySelect = (selectedCity) => {
        setCity(selectedCity)
        setSearchQuery(selectedCity)
        setShowSuggestions(false)
    }

    if (loading)
        return (
            <div style={{ padding: "20px", textAlign: "center" }}>
                Memuat jadwal sholat bulanan untuk {city}...
            </div>
        )

    // Responsive styles
    const tableStyle = {
        width: "100%",
        borderCollapse: "collapse",
        fontFamily: "Inter, sans-serif",
        color: "#111011",
        fontSize: isMobile ? "12px" : "14px",
    }

    const headerStyle = {
        backgroundColor: "#F1B234",
        color: "#ffffff",
        fontWeight: "600",
        fontSize: isMobile ? "12px" : "14px",
        padding: isMobile ? "6px 8px" : "8px 12px",
    }

    const cellStyle = {
        padding: isMobile ? "6px 8px" : "8px 12px",
        border: "1px solid #2d3748",
        fontSize: isMobile ? "12px" : "14px",
        textAlign: "center"
    }
    
    const dateCellStyle = { ...cellStyle, textAlign: "left" }

    const todayRowStyle = {
        backgroundColor: "#facc15",
        color: "#000000",
        fontWeight: "bold",
    }

    const colWidths = isMobile
        ? ["25%", "12.5%", "12.5%", "12.5%", "12.5%", "12.5%", "12.5%"]
        : ["20%", "10%", "10%", "10%", "10%", "10%", "10%", "10%"]

    return (
        <div
            style={{
                fontFamily: "Inter, sans-serif",
                padding: isMobile ? "10px" : "20px",
                maxWidth: "100%",
                overflowX: "hidden",
            }}
        >
            {/* Top Section */}
            <div
                style={{
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    alignItems: isMobile ? "flex-start" : "center",
                    justifyContent: "space-between",
                    padding: isMobile ? "15px" : "20px",
                    backgroundColor: "#D0DEDD",
                    borderRadius: "12px",
                    marginBottom: "20px",
                    gap: isMobile ? "15px" : "20px",
                }}
            >
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: isMobile ? "12px" : "14px", color: "#3d4852" }}>
                        Menuju waktu
                    </div>
                    <div style={{ fontSize: isMobile ? "16px" : "18px", fontWeight: "600", color: "#1a202c" }}>
                        Sholat {nextPrayer}
                    </div>
                    <div style={{ fontSize: isMobile ? "12px" : "14px", color: "#4a5568" }}>
                        di Kota {city}
                    </div>
                    <div style={{ fontSize: isMobile ? "22px" : "28px", fontWeight: "bold", marginTop: "10px" }}>
                        {timeLeft}
                    </div>
                </div>

                {/* City Search Input */}
                <div style={{ position: "relative", width: isMobile ? "100%" : "auto" }}>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="Cari kota di Indonesia..."
                        style={{
                            backgroundColor: "#fff",
                            padding: isMobile ? "8px 16px" : "10px 20px",
                            borderRadius: "8px",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            width: isMobile ? "100%" : "300px",
                            fontSize: isMobile ? "14px" : "16px",
                            fontWeight: "500",
                            border: "1px solid #ccc",
                        }}
                    />
                    {showSuggestions && suggestions.length > 0 && (
                        <div style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            backgroundColor: "#fff",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                            zIndex: 100,
                            maxHeight: "300px",
                            overflowY: "auto",
                            marginTop: "5px",
                        }}>
                            {suggestions.map((suggestion, index) => (
                                <div
                                    key={index}
                                    onClick={() => handleCitySelect(suggestion)}
                                    style={{
                                        padding: "10px 15px",
                                        cursor: "pointer",
                                        borderBottom: "1px solid #eee",
                                        ":hover": {
                                            backgroundColor: "#f5f5f5",
                                        },
                                    }}
                                >
                                    {suggestion}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quote */}
                {!isMobile && (
                    <div
                        style={{
                            flex: 1,
                            backgroundColor: "#3C6E71",
                            color: "#fff",
                            padding: "15px 20px",
                            borderRadius: "12px",
                            fontSize: "14px",
                            fontStyle: "italic",
                        }}
                    >
                        <b>Hadis Sholat</b>
                        <br />
                        "Shalat itu tiang agama. Barangsiapa mendirikannya maka sungguh ia telah mendirikan agama, dan barangsiapa meninggalkannya maka sungguh ia telah meruntuhkan agama." (HR. Baihaqi)
                    </div>
                )}
            </div>

            {/* Today's Schedule (Single Line) */}
            <div
                style={{
                    backgroundColor: "#1b2b2f",
                    color: "#fff",
                    display: "flex",
                    flexWrap: isMobile ? "wrap" : "nowrap",
                    justifyContent: "space-around",
                    padding: isMobile ? "8px 0" : "10px 0",
                    borderRadius: "8px",
                    marginBottom: "20px",
                    gap: isMobile ? "5px" : "0",
                }}
            >
                {todayTimings &&
                    [
                        { key: "Fajr", name: "Subuh" },
                        { key: "Sunrise", name: "Terbit" },
                        { key: "Dhuha", name: "Dhuha" },
                        { key: "Dhuhr", name: "Dzuhur" },
                        { key: "Asr", name: "Ashar" },
                        { key: "Maghrib", name: "Maghrib" },
                        { key: "Isha", name: "Isya" },
                    ].map((prayer) => (
                        <div
                            key={prayer.key}
                            style={{
                                textAlign: "center",
                                minWidth: isMobile ? "calc(33% - 10px)" : "70px",
                                padding: "5px 0",
                                backgroundColor: nextPrayer === prayer.name ? "#3C6E71" : "transparent",
                                borderRadius: "6px",
                                margin: isMobile ? "2px 0" : "0",
                            }}
                        >
                            <div style={{ fontSize: isMobile ? "10px" : "12px", color: "#cbd5e0" }}>
                                {prayer.name}
                            </div>
                            <div style={{ fontWeight: "bold", fontSize: isMobile ? "14px" : "16px" }}>
                                {todayTimings[prayer.key]?.slice(0, 5)}
                            </div>
                        </div>
                    ))}
            </div>

            {/* Monthly Table */}
            <div
                style={{
                    overflowX: "auto",
                    width: "100%",
                    WebkitOverflowScrolling: "touch",
                    borderRadius: "8px",
                    border: isMobile ? "1px solid #e2e8f0" : "none",
                }}
            >
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            {[
                                "Tanggal", "Subuh", "Terbit", "Dhuha", "Dzuhur", "Ashar", "Maghrib", "Isya",
                            ].map((heading, i) => (
                                <th
                                    key={i}
                                    style={{
                                        ...cellStyle,
                                        ...headerStyle,
                                        width: colWidths[i],
                                        whiteSpace: "nowrap",
                                        textAlign: i === 0 ? 'left' : 'center',
                                    }}
                                >
                                    {isMobile && i > 0 ? heading.substring(0, 3) : heading}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((entry, idx) => {
                            const dateISO = entry.date.gregorian.date
                            const [day, month, year] = dateISO.split("-")
                            const formatted = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
                            const isToday = formatted === today
                            const weekdayName = entry.date.gregorian.weekday.en
                            const indonesianWeekday = INDONESIAN_DAYS[weekdayName] || weekdayName
                            const displayDate = (
                                <div style={{ lineHeight: "1.4" }}>
                                    <div>{indonesianWeekday},</div>
                                    <div>
                                        {isMobile
                                            ? `${day}/${month}`
                                            : `${day}/${month}/${year}`}
                                    </div>
                                </div>
                            )
                            const timings = entry.timings

                            return (
                                <tr key={idx} style={isToday ? todayRowStyle : {}}>
                                    <td style={dateCellStyle}>{displayDate}</td>
                                    <td style={cellStyle}>{timings.Fajr.slice(0, 5)}</td>
                                    <td style={cellStyle}>{timings.Sunrise.slice(0, 5)}</td>
                                    <td style={cellStyle}>{timings.Dhuha.slice(0, 5)}</td>
                                    <td style={cellStyle}>{timings.Dhuhr.slice(0, 5)}</td>
                                    <td style={cellStyle}>{timings.Asr.slice(0, 5)}</td>
                                    <td style={cellStyle}>{timings.Maghrib.slice(0, 5)}</td>
                                    <td style={cellStyle}>{timings.Isha.slice(0, 5)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}