'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');


class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);

    constructor(distance, duration, coords) {
        this.distance = distance; // in km
        this.duration = duration; // in min
        this.coords = coords; // [lat, lng]
    }

    _setDescription() {
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }
}

class Running extends Workout {
    type = 'running';

    constructor(distance, duration, coords, cadence) {
        super(distance, duration, coords);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        // min/km
        this.pace = this.duration / this.distance;
    }
}
class Cycling extends Workout {
    type = 'cycling';

    constructor(distance, duration, coords, elevationGain) {
        super(distance, duration, coords);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        // km/h
        this.speed = this.distance / (this.distance / 60);
    }
}






//////////////////////////////////////////////////////
// Application Architecture
class App {
    #map;
    #mapEvent;
    #workouts = [];

    constructor() {
        // Get users position
        this._getPosition();

        // Get data from local storage
        this._getLocalStorage();

        // Event Handlers
        form.addEventListener('submit', this._newWorkout.bind(this));
        // Set inputType option on page load
        this._toggleElevationField();
        // Set inputType option on change
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    }

    _getPosition() {
        navigator.geolocation.getCurrentPosition(
            this._loadMap.bind(this),
            this._loadDefaultMap.bind(this)
        )
    }

    _loadMap(position) {
        // Destructuring lat and lng
        const { coords: { latitude, longitude } } = position;

        this.#map = L.map('map').setView([latitude, longitude], 13);

        L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        // Show form when user clicks on the map
        this.#map.on('click', this._showForm.bind(this))

        this.#workouts.forEach(workout => {
            this._renderWorkoutMarker(workout);
        })
    }

    // Load Default Map When The Users Location Was Missed
    _loadDefaultMap() {
        this.#map = L.map('map').setView([35.69404895695763, 51.38721244128801], 13);

        L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        // Show form when user clicks on the map
        this.#map.on('click', this._showForm.bind(this))

        this.#workouts.forEach(workout => {
            this._renderWorkoutMarker(workout);
        })
    }

    _showForm(e) {
        this.#mapEvent = e;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm() {
        // Reseting all the inputs
        inputDistance.value = '';
        inputDuration.value = '';
        inputCadence.value = '';
        inputElevation.value = '';

        // Hidding form after Submitting
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => {
            form.style.display = 'grid';
        }, 0.5);
    }

    _toggleElevationField() {
        if (inputType.value === 'running') {
            inputCadence.closest('.form__row').classList.remove('form__row--hidden');
            inputElevation.closest('.form__row').classList.add('form__row--hidden');
        }
        if (inputType.value === 'cycling') {
            inputCadence.closest('.form__row').classList.add('form__row--hidden');
            inputElevation.closest('.form__row').classList.remove('form__row--hidden');
        }

    }

    _newWorkout(formEvent) {
        // Helper Functions
        const validInputs = (...inputs) =>
            inputs.every(input => Number.isFinite(input));
        const positiveInputs = (...inputs) =>
            inputs.every(input => input > 0);

        // Preventing form from default behavior
        formEvent.preventDefault();


        // Get data from form
        const type = inputType.value;
        const duration = +inputDuration.value;
        const distance = +inputDistance.value;
        const { latlng } = this.#mapEvent;
        let workout;

        // if running, create running object
        if (type === 'running') {
            const cadence = +inputCadence.value;
            // Check if data is valid
            if (!validInputs(duration, distance, cadence)
                || !positiveInputs(duration, distance, cadence)) {
                return alert('Please Enter A Positive Number!')
            }

            // Add new workout to workout array
            workout = new Running(distance, duration, latlng, cadence);
        }

        // if cycling, create cycling object
        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            // Check if data is valid
            if (!validInputs(duration, distance, elevation)
                || !positiveInputs(duration, distance)) {
                return alert('Please Enter A Positive Number!')
            }

            workout = new Cycling(distance, duration, latlng, elevation);
        }

        console.log(this.#workouts)

        // Add new workout to workout array
        this.#workouts.push(workout)

        // Render workout on list
        this._renderWorkout(workout);

        // Render workout on map
        this._renderWorkoutMarker(workout);

        // Hide Form
        this._hideForm();

        // Set local storage to all workouts
        this._SetLocalStorage();
    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords)
            .addTo(this.#map)
            .bindPopup(
                L.popup(
                    {
                        autoClose: false,
                        closeOnClick: false,
                        className: `${workout.type}-popup`
                    }
                )
                    .setContent(`${inputType.value === 'running' ? '🏃‍♂️' : '🚴‍♂️'} ${workout.description}`)
            )
            .openPopup();
    }

    _renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__details">
                <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'}</span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value">${workout.duration}</span>
                <span class="workout__unit">min</span>
            </div>
        `;

        if (workout.type === 'running')
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.pace.toFixed(1)}</span>
                    <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">🦶🏼</span>
                    <span class="workout__value">${workout.cadence}</span>
                    <span class="workout__unit">spm</span>
                </div>
            </li>
            `;
        if (workout.type === 'cycling')
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.speed.toFixed(1)}</span>
                    <span class="workout__unit">km/h</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workout.elevationGain}</span>
                    <span class="workout__unit">m</span>
                </div>
            </li>
            `;

        form.insertAdjacentHTML('afterend', html)
    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');

        if (!workoutEl) return;

        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);
        const { coords: { lat, lng } } = workout;

        this.#map.setView([lat, lng], 13, {
            animate: true,
            pan: {
                duration: 1
            }
        });
    }

    _SetLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts))
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));
        console.log(data);

        if (!data) return;

        this.#workouts = data;

        this.#workouts.forEach(workout => {
            this._renderWorkout(workout);
            // this._renderWorkoutMarker(workout);
        })
    }
}

const app = new App();

