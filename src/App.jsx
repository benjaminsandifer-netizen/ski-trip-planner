import Hero from "./components/Hero";
import CostEstimator from "./components/CostEstimator";
import DateVoting from "./components/DateVoting";
import HouseVoting from "./components/HouseVoting";
import WeatherWidget from "./components/WeatherWidget";
import RestaurantList from "./components/RestaurantList";
import ShoppingList from "./components/ShoppingList";

function App() {
  return (
    <div className="min-h-screen">
      <Hero />
      <main className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">
        <WeatherWidget />
        <CostEstimator />
        <DateVoting />
        <HouseVoting />
        <RestaurantList />
        <ShoppingList />
      </main>
      <footer className="text-center text-xs text-slate-400 py-6">
        Park City Ski Trip Planner &middot; Have a great trip!
      </footer>
    </div>
  );
}

export default App;
